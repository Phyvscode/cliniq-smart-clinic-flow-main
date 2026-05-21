import { Response } from "express";
import Queue from "../models/Queue";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { todayString } from "../utils/generateToken";

// GET /api/queue
export const getQueue = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today = todayString();
  const queue = await Queue.find({ date: today })
    .populate("patient")
    .populate("assignedDoctor", "name email")   // ← NEW
    .sort({ queueNumber: 1 });
  res.json({ queue });
});

// POST /api/queue
export const addToQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { patientId, doctorId } = req.body;   // ← doctorId is NEW
  if (!patientId) {
    res.status(400).json({ message: "patientId is required" });
    return;
  }

  const today       = todayString();
  const count       = await Queue.countDocuments({ date: today });
  const queueNumber = count + 1;

  const entry = await Queue.create({
    patient:        patientId,
    assignedDoctor: doctorId || undefined,      // ← NEW
    queueNumber,
    status:         "waiting",
    date:           today,
  });

  // Auto-promote if no one is in consultation
  const activeCount = await Queue.countDocuments({ date: today, status: "in-consultation" });
  if (activeCount === 0) {
    entry.status = "in-consultation";
    await entry.save();
  }

  const populated = await entry.populate([
    { path: "patient" },
    { path: "assignedDoctor", select: "name email" },  // ← NEW
  ]);
  res.status(201).json({ entry: populated });
});

// POST /api/queue/next
export const nextPatient = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today = todayString();

  await Queue.findOneAndUpdate(
    { date: today, status: "in-consultation" },
    { status: "done" },
  );

  const nextEntry = await Queue.findOneAndUpdate(
    { date: today, status: "waiting" },
    { status: "in-consultation" },
    { new: true, sort: { queueNumber: 1 } },
  ).populate("patient").populate("assignedDoctor", "name email");

  res.json({ message: "Queue advanced", next: nextEntry || null });
});

// PATCH /api/queue/:id
export const updateQueueStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const entry = await Queue.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true },
  ).populate("patient").populate("assignedDoctor", "name email");

  if (!entry) {
    res.status(404).json({ message: "Queue entry not found" });
    return;
  }
  res.json({ entry });
});

// DELETE /api/queue/:id
export const removeFromQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const entry = await Queue.findByIdAndDelete(req.params.id);
  if (!entry) {
    res.status(404).json({ message: "Queue entry not found" });
    return;
  }
  res.json({ message: "Removed from queue" });
});