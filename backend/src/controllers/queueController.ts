import { Response } from "express";
import Queue from "../models/Queue";
import Staff from "../models/Staff";
import Patient from "../models/Patient";
import Payment from "../models/Payment";
import Bed from "../models/Bed";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { todayString } from "../utils/generateToken";

// GET /api/queue — today's ACTIVE entries for the doctor's department
export const getQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = todayString();

  // Show all active entries for today to all logged-in users
  const filter: any = { date: today, status: { $ne: "done" } };

  const queue = await Queue.find(filter)
    .populate("patient")
    .populate("doctor", "name")
    .sort({ queueNumber: 1 });

  res.json({ queue });
});

// POST /api/queue — add patient to department queue
export const addToQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { patientId, department } = req.body;

  if (!patientId) {
    res.status(400).json({ message: "patientId is required" });
    return;
  }
  if (!department) {
    res.status(400).json({ message: "Please select a department" });
    return;
  }

  const today = todayString();

  // Prevent duplicate: same patient + same department + today (not done)
  const existing = await Queue.findOne({
    patient:    patientId,
    department,
    date:       today,
    status:     { $ne: "done" },
  });
  if (existing) {
    res.status(409).json({
      message: `This patient is already in the ${department} queue today`,
    });
    return;
  }

  // Queue number = entries for this department today + 1
  const count       = await Queue.countDocuments({ date: today, department });
  const queueNumber = count + 1;

  const datePart = today.replace(/-/g, "");
  const rxCode   = `${datePart}${String(queueNumber).padStart(3, "0")}`;

  const entry = await Queue.create({
    patient:     patientId,
    queueNumber,
    status:      "waiting",
    date:        today,
    rxCode,
    department,
  });

  // Auto-promote if no one is in-consultation in this department
  const activeCount = await Queue.countDocuments({
    date: today, department, status: "in-consultation",
  });
  if (activeCount === 0) {
    entry.status = "in-consultation";
    await entry.save();
  }

  const populated = await entry.populate("patient");
  res.status(201).json({ entry: populated, rxCode });
});

// POST /api/queue/next — doctor calls next patient in their department
export const nextPatient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = todayString();

  const staff = await Staff.findOne({ user: req.user?._id }).lean() as any;
  const department = staff?.department;
  const filter = department ? { date: today, department } : { date: today };

  // Mark current in-consultation as done
  await Queue.findOneAndUpdate(
    { ...filter, status: "in-consultation" },
    { status: "done", doctor: req.user?._id || undefined },
  );

  // Promote next waiting patient
  const nextEntry = await Queue.findOneAndUpdate(
    { ...filter, status: "waiting" },
    { status: "in-consultation" },
    { new: true, sort: { queueNumber: 1 } },
  ).populate("patient");

  res.json({ message: "Queue advanced", next: nextEntry || null });
});

// PATCH /api/queue/:id
export const updateQueueStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const update: any = { status };
  if (status === "done" && req.user?._id) update.doctor = req.user._id;
  const entry = await Queue.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true },
  ).populate("patient").populate("doctor", "name");
  if (!entry) { res.status(404).json({ message: "Queue entry not found" }); return; }

  if (status === "done") await vacateBedForQueueEntry(entry._id);

  res.json({ entry });
});

// DELETE /api/queue/:id
export const removeFromQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const entry = await Queue.findByIdAndDelete(req.params.id);
  if (!entry) { res.status(404).json({ message: "Queue entry not found" }); return; }

  await vacateBedForQueueEntry(entry._id);

  res.json({ message: "Removed from queue" });
});

// Frees any bed admitted against this queue entry — called when the visit ends
// (marked done) or the entry is removed from the queue.
const vacateBedForQueueEntry = async (queueEntryId: unknown) => {
  await Bed.updateMany(
    { queueEntry: queueEntryId, status: "occupied" },
    { $set: { status: "available" }, $unset: { patient: "", queueEntry: "", occupiedAt: "" } },
  );
};

// GET /api/queue/history?date=YYYY-MM-DD[&to=YYYY-MM-DD] — visits for a date or date range
// (all statuses). Used by the admin "Patients" page — a visit is a Queue entry,
// independent of whether a payment has been collected for it yet.
export const getQueueHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const date = (req.query.date as string) || todayString();
  const to   = (req.query.to as string) || date;

  const dateCond = date === to ? date : { $gte: date, $lte: to };

  const entries = await Queue.find({ date: dateCond })
    .populate("patient")
    .populate("doctor", "name")
    .sort({ date: -1, queueNumber: 1 });

  const patientIds = entries.map(e => e.patient?._id).filter(Boolean);
  const [payments, patients] = await Promise.all([
    Payment.find({ patient: { $in: patientIds }, date: dateCond }),
    Patient.find({ _id: { $in: patientIds } }, "createdAt"),
  ]);

  const paymentByPatientDate = new Map(payments.map(p => [`${p.patient}-${p.date}`, p]));
  const firstVisitDate = new Map(patients.map(p => [String(p._id), (p as any).createdAt?.toISOString().slice(0, 10)]));

  const enriched = entries.map(e => {
    const obj: any = e.toObject();
    const pid = String(e.patient?._id || "");
    const payment = paymentByPatientDate.get(`${pid}-${e.date}`);
    return {
      ...obj,
      payment: payment ? { amount: payment.amount, method: payment.method, type: payment.type } : null,
      visitType: firstVisitDate.get(pid) === e.date ? "new" : "existing",
    };
  });

  res.json({ entries: enriched, date, to });
});