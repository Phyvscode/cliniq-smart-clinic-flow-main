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
  const { paymentMethod, amount } = req.body;
  const order = await LabOrder.findByIdAndUpdate(
    req.params.id, { feeCollected: true, paymentMethod, amount: Number(amount) || 0 }, { new: true }
  ).populate(POPULATE);

  if (!order) { res.status(404).json({ message: "Lab order not found" }); return; }
  res.json({ order });
});

// GET /api/lab/analytics?date=&to= — real revenue/test breakdown for the admin Laboratory page
export const getLabAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const date = (req.query.date as string) || todayString();
  const to   = (req.query.to as string) || date;
  const dateCond = date === to ? date : { $gte: date, $lte: to };

  const orders = await LabOrder.find({ date: dateCond }).populate("doctor", "name");

  let totalTests = 0;
  let revenue    = 0;
  let pending    = 0;
  const testCounts: Record<string, number> = {};
  const referrals: Record<string, { doctorName: string; tests: number; revenue: number }> = {};

  for (const o of orders as any[]) {
    totalTests += o.tests.length;
    if (o.feeCollected) revenue += o.amount || 0;
    else pending += 1;

    for (const t of o.tests) testCounts[t] = (testCounts[t] || 0) + 1;

    const docName = o.doctor?.name || "Unknown";
    if (!referrals[docName]) referrals[docName] = { doctorName: docName, tests: 0, revenue: 0 };
    referrals[docName].tests   += o.tests.length;
    referrals[docName].revenue += o.feeCollected ? (o.amount || 0) : 0;
  }

  const tests = Object.entries(testCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  res.json({
    stats: { totalTests, revenue, pending },
    tests,
    referrals: Object.values(referrals).sort((a, b) => b.tests - a.tests),
  });
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
