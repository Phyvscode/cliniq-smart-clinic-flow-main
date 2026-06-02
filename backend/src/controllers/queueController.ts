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

// POST /api/queue  — add a patient to a specific doctor's queue
export const addToQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { patientId, doctorId } = req.body;
  if (!patientId) {
    res.status(400).json({ message: "patientId is required" });
    return;
  }
  if (!doctorId) {
    res.status(400).json({ message: "Please select a doctor before adding to queue" });
    return;
  }

  const today = todayString();

  // ── Prevent duplicate: same patient + same doctor today ──────────────────
  const existingEntry = await Queue.findOne({
    patient: patientId,
    doctor:  doctorId,
    date:    today,
    status:  { $ne: "done" },
  });
  if (existingEntry) {
    res.status(409).json({
      message: "This patient is already in this doctor\'s queue today",
    });
    return;
  }

  // Queue number = total entries for this doctor today + 1
  const count       = await Queue.countDocuments({ date: today, doctor: doctorId });
  const queueNumber = count + 1;

  const datePart = today.replace(/-/g, "");
  const rxCode   = `${datePart}${String(queueNumber).padStart(3, "0")}`;

  const entry = await Queue.create({
    patient:     patientId,
    queueNumber,
    status:      "waiting",
    date:        today,
    rxCode,
    doctor:      doctorId,
  });

  // If this doctor has no one in-consultation, promote this patient
  const activeCount = await Queue.countDocuments({
    date: today, doctor: doctorId, status: "in-consultation",
  });
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