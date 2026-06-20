import { Response } from "express";
import LabOrder from "../models/LabOrder";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { todayString } from "../utils/generateToken";

const POPULATE = [
  { path: "patient", select: "name age gender phone permanentCode" },
  { path: "doctor",  select: "name" },
];

// POST /api/lab/orders — doctor creates an order
export const createLabOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { patientId, tests, notes } = req.body;
  if (!patientId)              { res.status(400).json({ message: "patientId is required" });           return; }
  if (!tests || !tests.length) { res.status(400).json({ message: "At least one test is required" });  return; }

  const order = await LabOrder.create({
    patient:      patientId,
    doctor:       req.user?._id,
    tests,
    notes,
    date:         todayString(),
    status:       "ordered",
    feeCollected: false,
  });

  const populated = await order.populate(POPULATE);
  res.status(201).json({ order: populated });
});

// GET /api/lab/orders?date=&status=
export const getLabOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const date = (req.query.date as string) || todayString();
  const filter: any = { date };
  if (req.query.status) filter.status = req.query.status;

  const orders = await LabOrder.find(filter)
    .populate(POPULATE)
    .sort({ createdAt: 1 });

  res.json({ orders });
});

// PATCH /api/lab/orders/:id/status
export const updateLabOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const order = await LabOrder.findByIdAndUpdate(
    req.params.id, { status }, { new: true }
  ).populate(POPULATE);

  if (!order) { res.status(404).json({ message: "Lab order not found" }); return; }
  res.json({ order });
});

// PATCH /api/lab/orders/:id/fee — receptionist collects payment
export const collectLabFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { paymentMethod } = req.body;
  const order = await LabOrder.findByIdAndUpdate(
    req.params.id, { feeCollected: true, paymentMethod }, { new: true }
  ).populate(POPULATE);

  if (!order) { res.status(404).json({ message: "Lab order not found" }); return; }
  res.json({ order });
});

// PATCH /api/lab/orders/:id/report — lab tech uploads PDF as base64
export const uploadLabReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reportBase64, reportFileName } = req.body;
  if (!reportBase64) { res.status(400).json({ message: "reportBase64 is required" }); return; }

  const order = await LabOrder.findByIdAndUpdate(
    req.params.id,
    { reportBase64, reportFileName, status: "report_ready" },
    { new: true }
  ).populate(POPULATE);

  if (!order) { res.status(404).json({ message: "Lab order not found" }); return; }
  res.json({ order });
});
