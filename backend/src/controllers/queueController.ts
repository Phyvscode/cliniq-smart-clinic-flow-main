import { Response } from "express";
import Queue from "../models/Queue";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { todayString } from "../utils/generateToken";

// GET /api/queue  — today's entries, populated with patient
export const getQueue = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today = todayString();
  const queue = await Queue.find({ date: today })
    .populate("patient")
    .sort({ queueNumber: 1 });
  res.json({ queue });
});

// POST /api/queue  — add a patient to today's queue (multiple visits allowed)
export const addToQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { patientId, doctorId } = req.body;
  if (!patientId) {
    res.status(400).json({ message: "patientId is required" });
    return;
  }

  const today = todayString();   // YYYY-MM-DD

  // Queue number = total entries today + 1
  const count       = await Queue.countDocuments({ date: today });
  const queueNumber = count + 1;

  // Generate rxCode: YYYYMMDD + zero-padded 3-digit queue number
  const datePart = today.replace(/-/g, "");                          // "20260506"
  const rxCode   = `${datePart}${String(queueNumber).padStart(3, "0")}`; // "20260506001"

  // Assign a permanent 6-digit code to patient if they don't have one yet
  const Patient = (await import("../models/Patient")).default;
  const patient  = await Patient.findById(patientId);
  if (patient && !patient.permanentCode) {
    // Generate unique 6-digit code
    let code = "";
    let attempts = 0;
    while (attempts < 20) {
      code = String(Math.floor(100000 + Math.random() * 900000));
      const exists = await Patient.findOne({ permanentCode: code });
      if (!exists) break;
      attempts++;
    }
    patient.permanentCode = code;
    await patient.save();
  }

  const entry = await Queue.create({
    patient:     patientId,
    queueNumber,
    status:      "waiting",
    date:        today,
    rxCode,
    doctor:      doctorId || undefined,
  });

  // If no one is currently in-consultation, promote this patient automatically
  const activeCount = await Queue.countDocuments({ date: today, status: "in-consultation" });
  if (activeCount === 0) {
    entry.status = "in-consultation";
    await entry.save();
  }

  const populated = await entry.populate("patient");
  res.status(201).json({ entry: populated, rxCode });
});

// POST /api/queue/next  — advance queue
export const nextPatient = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today = todayString();

  // Mark current in-consultation as done
  await Queue.findOneAndUpdate(
    { date: today, status: "in-consultation" },
    { status: "done" },
  );

  // Promote next waiting patient
  const nextEntry = await Queue.findOneAndUpdate(
    { date: today, status: "waiting" },
    { status: "in-consultation" },
    { new: true, sort: { queueNumber: 1 } },
  ).populate("patient");

  res.json({ message: "Queue advanced", next: nextEntry || null });
});

// PATCH /api/queue/:id  — update status manually
export const updateQueueStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const entry = await Queue.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true },
  ).populate("patient");

  if (!entry) {
    res.status(404).json({ message: "Queue entry not found" });
    return;
  }
  res.json({ entry });
});

// DELETE /api/queue/:id  — remove from queue
export const removeFromQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const entry = await Queue.findByIdAndDelete(req.params.id);
  if (!entry) {
    res.status(404).json({ message: "Queue entry not found" });
    return;
  }
  res.json({ message: "Removed from queue" });
});