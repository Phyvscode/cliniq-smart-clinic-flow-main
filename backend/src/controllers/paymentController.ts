import { Response } from "express";
import Payment from "../models/Payment";
import Queue from "../models/Queue";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const todayStr = () => new Date().toISOString().split("T")[0];

// ── POST /api/payments ────────────────────────────────────────────────────────
// Called by reception when patient pays consultation fee
export const createPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { patientId, amount, type, method, notes, queueEntryId } = req.body;

  if (!patientId || amount === undefined) {
    res.status(400).json({ message: "patientId and amount are required" });
    return;
  }
  if (amount < 0) {
    res.status(400).json({ message: "Amount cannot be negative" });
    return;
  }

  const payment = await Payment.create({
    patient:     patientId,
    amount:      Number(amount),
    type:        type   || "consultation",
    method:      method || "cash",
    notes:       notes  || "",
    date:        todayStr(),
    collectedBy: req.user!._id,
    queueEntry:  queueEntryId || undefined,
  });

  // Attach queueEntry reference back on the queue doc (optional metadata)
  if (queueEntryId) {
    await Queue.findByIdAndUpdate(queueEntryId, { $set: { paymentId: payment._id } });
  }

  const populated = await payment.populate([
    { path: "patient", select: "name phone" },
    { path: "collectedBy", select: "name" },
  ]);

  res.status(201).json({ payment: populated });
});

// ── PATCH /api/payments/:id/assign-doctor ─────────────────────────────────────
// Called internally when prescription is saved — links doctor to the payment
export const assignDoctorToPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { doctorId } = req.body;
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { doctor: doctorId },
    { new: true }
  );
  if (!payment) { res.status(404).json({ message: "Payment not found" }); return; }
  res.json({ payment });
});

// ── PATCH /api/payments/by-queue/:queueEntryId/assign-doctor ─────────────────
// Assign doctor to payment by queue entry (called when prescription is saved)
export const assignDoctorByQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { doctorId } = req.body;
  await Payment.updateMany(
    { queueEntry: req.params.queueEntryId },
    { $set: { doctor: doctorId } }
  );
  res.json({ message: "Doctor assigned to payment" });
});

// ── GET /api/payments ─────────────────────────────────────────────────────────
export const getPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date } = req.query;
  const filter: any = {};
  if (date) filter.date = date;

  const payments = await Payment.find(filter)
    .populate("patient", "name phone")
    .populate("doctor",  "name")
    .populate("collectedBy", "name")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ payments });
});