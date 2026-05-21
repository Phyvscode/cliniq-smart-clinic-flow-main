/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import Payment from "../models/Payment";
import Queue from "../models/Queue";
import User from "../models/User";
import Staff from "../models/Staff";
import SalaryConfig from "../models/SalaryConfig";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

// ─── Date helpers ─────────────────────────────────────────────────────────────
const todayStr = (): string => new Date().toISOString().split("T")[0];
const monthStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const yearStr = (): string => String(new Date().getFullYear());

// Safely read total from aggregate result
const aggTotal = (rows: any[]): number => (rows[0] as any)?.total ?? 0;

// ─── Tier 1 ───────────────────────────────────────────────────────────────────

export const getRevenueStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today = todayStr();
  const month = monthStr();
  const year  = yearStr();

  const [todayTotal, monthTotal, yearTotal, allTimeTotal] = await Promise.all([
    Payment.aggregate([{ $match: { date: today } },                   { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Payment.aggregate([{ $match: { date: { $regex: `^${month}` } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Payment.aggregate([{ $match: { date: { $regex: `^${year}`  } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Payment.aggregate([                                                 { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);

  const patientsToday   = await Queue.countDocuments({ date: today });
  const revenueByType   = await Payment.aggregate([{ $match: { date: today } }, { $group: { _id: "$type",   total: { $sum: "$amount" }, count: { $sum: 1 } } }]);
  const revenueByMethod = await Payment.aggregate([{ $match: { date: today } }, { $group: { _id: "$method", total: { $sum: "$amount" }                      } }]);

  res.json({
    today:    aggTotal(todayTotal),
    month:    aggTotal(monthTotal),
    year:     aggTotal(yearTotal),
    allTime:  aggTotal(allTimeTotal),
    patientsToday,
    revenueByType,
    revenueByMethod,
  });
});

export const getDoctorRevenueStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const month   = monthStr();
  const doctors = await User.find({ role: "doctor" }).select("_id name email").lean();

  const doctorRevenue: any[] = await Payment.aggregate([
    { $match: { date: { $regex: `^${month}` }, doctor: { $exists: true, $ne: null } } },
    { $group: { _id: "$doctor", revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  const revenueMap = new Map<string, any>(doctorRevenue.map((r: any) => [String(r._id), r]));

  const salaryConfigs = await SalaryConfig.find({ doctor: { $in: doctors.map((d: any) => d._id) } });
  const salaryMap     = new Map<string, any>(salaryConfigs.map((s: any) => [String(s.doctor), s]));

  const stats = doctors.map((d: any) => {
    const id     = String(d._id);
    const rev    = revenueMap.get(id) ?? { revenue: 0, count: 0 };
    const salary = salaryMap.get(id);

    let payout = 0;
    if (salary) {
      if (salary.type === "fixed")           payout = salary.fixedAmount ?? 0;
      else if (salary.type === "percentage") payout = Math.round(rev.revenue * (salary.percentage ?? 0) / 100);
      else if (salary.type === "mixed")      payout = salary.mixedFixed ?? 0;
    }

    return {
      doctorId:              id,
      name:                  d.name as string,
      revenueGenerated:      rev.revenue as number,
      patientsSeenThisMonth: rev.count as number,
      salaryType:            salary?.type            ?? null,
      fixedAmount:           salary?.fixedAmount     ?? null,
      percentage:            salary?.percentage      ?? null,
      mixedFixed:            salary?.mixedFixed      ?? null,
      consultationPct:       salary?.consultationPct ?? null,
      procedurePct:          salary?.procedurePct    ?? null,
      estimatedPayout:       payout,
    };
  });

  res.json({ doctors: stats });
});

export const getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query    = (req as any).query as Record<string, string>;
  const date     = query.date;
  const doctorId = query.doctorId;
  const pageNum  = Math.max(1, parseInt(query.page  ?? "1",  10));
  const limitNum = Math.min(200, parseInt(query.limit ?? "50", 10));
  const skip     = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};
  if (date)     filter.date   = date;
  if (doctorId) filter.doctor = doctorId;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("patient",     "name phone")
      .populate("doctor",      "name")
      .populate("collectedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Payment.countDocuments(filter),
  ]);

  res.json({ payments, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

export const getMonthlyTrend = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const months: string[] = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }

  const trend = await Promise.all(months.map(async (m: string) => {
    const rows: any[] = await Payment.aggregate([
      { $match: { date: { $regex: `^${m}` } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    return { month: m, revenue: aggTotal(rows), count: (rows[0] as any)?.count ?? 0 };
  }));

  res.json({ trend });
});

// ─── Tier 2 ───────────────────────────────────────────────────────────────────

export const getDailyGraph = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query  = (req as any).query as Record<string, string>;
  const period = query.period ?? "days";
  const dateQ  = query.date;
  const days   = Math.min(30, Math.max(7, parseInt(query.days ?? "7", 10)));

  const today = todayStr();

  // ── Year: one point per month ─────────────────────────────────────────────
  if (period === "year") {
    const yearNum = new Date().getFullYear();
    const currM   = new Date().getMonth();
    const monthlyData = await Promise.all(
      Array.from({ length: currM + 1 }, async (_: unknown, m: number) => {
        const mp   = `${yearNum}-${String(m + 1).padStart(2, "0")}`;
        const rows: any[] = await Payment.aggregate([
          { $match: { date: { $regex: `^${mp}` } } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]);
        return {
          date:     mp,
          label:    new Date(yearNum, m, 1).toLocaleString("en-IN", { month: "short" }),
          revenue:  aggTotal(rows),
          patients: (rows[0] as any)?.count ?? 0,
        };
      })
    );
    return res.json({ data: monthlyData, period });
  }

  // ── Month: every day this calendar month ─────────────────────────────────
  if (period === "month") {
    const now        = new Date();
    const totalDays  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dates: string[] = [];
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      if (d > now) break;
      dates.push(d.toISOString().split("T")[0]);
    }
    const data = await Promise.all(dates.map(async (date: string) => {
      const rows: any[] = await Payment.aggregate([
        { $match: { date } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]);
      return { date, revenue: aggTotal(rows), patients: (rows[0] as any)?.count ?? 0 };
    }));
    return res.json({ data, period });
  }

  // ── Week: last 7 days ─────────────────────────────────────────────────────
  if (period === "week") {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    const data = await Promise.all(dates.map(async (date: string) => {
      const rows: any[] = await Payment.aggregate([
        { $match: { date } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]);
      return { date, revenue: aggTotal(rows), patients: (rows[0] as any)?.count ?? 0 };
    }));
    return res.json({ data, period });
  }

  // ── Specific day ──────────────────────────────────────────────────────────
  if (period === "day") {
    const target = dateQ ?? today;
    const rows: any[] = await Payment.aggregate([
      { $match: { date: target } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    return res.json({
      data: [{ date: target, revenue: aggTotal(rows), patients: (rows[0] as any)?.count ?? 0 }],
      period,
    });
  }

  // ── Default: last N days (7 / 14 / 30) ───────────────────────────────────
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  const data = await Promise.all(dates.map(async (date: string) => {
    const rows: any[] = await Payment.aggregate([
      { $match: { date } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    return { date, revenue: aggTotal(rows), patients: (rows[0] as any)?.count ?? 0 };
  }));
  res.json({ data, period });
});

export const getRevenueByDepartment = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const month    = monthStr();
  const payments = await Payment.find({ date: { $regex: `^${month}` } }).populate("doctor", "_id name");

  const doctorIds = [...new Set(
    payments.filter((p: any) => p.doctor).map((p: any) => String(p.doctor?._id ?? p.doctor))
  )];

  const staffProfiles = await Staff.find({ user: { $in: doctorIds } }).select("user department specialization").lean();
  const deptMap       = new Map<string, string>(
    (staffProfiles as any[]).map((s: any) => [String(s.user), String(s.department || s.specialization || "General")])
  );

  const deptRevenue: Record<string, number> = {};
  for (const p of payments as any[]) {
    const docId = p.doctor ? String(p.doctor?._id ?? p.doctor) : null;
    const dept  = docId ? (deptMap.get(docId) ?? "Unassigned") : "Unassigned";
    deptRevenue[dept] = (deptRevenue[dept] ?? 0) + (p.amount as number);
  }

  const result = Object.entries(deptRevenue)
    .map(([department, revenue]) => ({ department, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  res.json({ departments: result });
});

export const getDoctorPerformance = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const month   = monthStr();
  const doctors = await User.find({ role: "doctor" }).select("_id name").lean();

  const [doctorPayments, salaryConfigs, staffProfiles] = await Promise.all([
    Payment.aggregate([
      { $match: { date: { $regex: `^${month}` }, doctor: { $exists: true, $ne: null } } },
      { $group: {
        _id:              "$doctor",
        totalRevenue:     { $sum: "$amount" },
        patientCount:     { $sum: 1 },
        cashRevenue:      { $sum: { $cond: [{ $eq: ["$method", "cash"]      }, "$amount", 0] } },
        upiRevenue:       { $sum: { $cond: [{ $eq: ["$method", "upi"]       }, "$amount", 0] } },
        cardRevenue:      { $sum: { $cond: [{ $eq: ["$method", "card"]      }, "$amount", 0] } },
        insuranceRevenue: { $sum: { $cond: [{ $eq: ["$method", "insurance"] }, "$amount", 0] } },
        consultRevenue:   { $sum: { $cond: [{ $in:  ["$type", ["consultation", "follow-up"]] }, "$amount", 0] } },
        procedureRevenue: { $sum: { $cond: [{ $eq:  ["$type", "procedure"] }, "$amount", 0] } },
      } },
    ]) as Promise<any[]>,
    SalaryConfig.find({ doctor: { $in: (doctors as any[]).map((d: any) => d._id) } }),
    Staff.find({ user: { $in: (doctors as any[]).map((d: any) => d._id) } }).select("user specialization department").lean(),
  ]);

  const payMap    = new Map<string, any>((doctorPayments as any[]).map((p: any) => [String(p._id), p]));
  const salaryMap = new Map<string, any>((salaryConfigs as any[]).map((s: any) => [String(s.doctor), s]));
  const staffMap  = new Map<string, any>((staffProfiles as any[]).map((s: any) => [String(s.user), s]));

  const performance = (doctors as any[]).map((d: any) => {
    const id               = String(d._id);
    const pay              = payMap.get(id) as any;
    const salary           = salaryMap.get(id);
    const staff            = staffMap.get(id) as any;
    const totalRevenue     = pay?.totalRevenue     ?? 0;
    const consultRevenue   = pay?.consultRevenue   ?? 0;
    const procedureRevenue = pay?.procedureRevenue ?? 0;

    let payout = 0;
    if (salary) {
      if (salary.type === "fixed")           payout = salary.fixedAmount ?? 0;
      else if (salary.type === "percentage") payout = Math.round(totalRevenue * (salary.percentage ?? 0) / 100);
      else if (salary.type === "mixed") {
        payout = (salary.mixedFixed ?? 0)
          + Math.round(consultRevenue   * (salary.consultationPct ?? 0) / 100)
          + Math.round(procedureRevenue * (salary.procedurePct    ?? 0) / 100);
      }
    }

    return {
      doctorId:         id,
      name:             d.name as string,
      specialization:   (staff?.specialization ?? staff?.department ?? "General") as string,
      totalRevenue,
      patientCount:     pay?.patientCount     ?? 0,
      cashRevenue:      pay?.cashRevenue      ?? 0,
      upiRevenue:       pay?.upiRevenue       ?? 0,
      cardRevenue:      pay?.cardRevenue      ?? 0,
      insuranceRevenue: pay?.insuranceRevenue ?? 0,
      consultRevenue,
      procedureRevenue,
      salaryType:       salary?.type            ?? null,
      percentage:       salary?.percentage      ?? null,
      fixedAmount:      salary?.fixedAmount     ?? null,
      mixedFixed:       salary?.mixedFixed      ?? null,
      consultationPct:  salary?.consultationPct ?? null,
      procedurePct:     salary?.procedurePct    ?? null,
      estimatedPayout:  payout,
      clinicEarnings:   totalRevenue - payout,
    };
  });

  res.json({ doctors: performance });
});

export const getPaymentBreakdown = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const month     = monthStr();
  const breakdown: any[] = await Payment.aggregate([
    { $match: { date: { $regex: `^${month}` } } },
    { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort:  { total: -1 } },
  ]);

  const totalRevenue = (breakdown as any[]).reduce((s: number, b: any) => s + (b.total as number), 0);
  const result = (breakdown as any[]).map((b: any) => ({
    method:     b._id as string,
    total:      b.total as number,
    count:      b.count as number,
    percentage: totalRevenue > 0 ? Math.round(((b.total as number) / totalRevenue) * 100) : 0,
  }));

  res.json({ breakdown: result, totalRevenue });
});

// ─── Tier 3 ───────────────────────────────────────────────────────────────────

export const getWeeklyTrend = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const fmtD = (d: Date): string => d.toISOString().split("T")[0];
  const weeks: { label: string; start: string; end: string }[] = [];

  for (let i = 7; i >= 0; i--) {
    const end   = new Date(); end.setDate(end.getDate() - i * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    weeks.push({ label: `W${8 - i}`, start: fmtD(start), end: fmtD(end) });
  }

  const data = await Promise.all(weeks.map(async (w: { label: string; start: string; end: string }) => {
    const payments = await Payment.find({ date: { $gte: w.start, $lte: w.end } }).lean();
    return {
      label:     w.label,
      weekStart: w.start,
      revenue:   (payments as any[]).reduce((s: number, p: any) => s + (p.amount as number), 0),
      patients:  payments.length,
    };
  }));

  const withGrowth = data.map((w, i: number) => ({
    ...w,
    growth: i === 0 ? 0
      : data[i - 1].revenue === 0 ? 100
      : Math.round(((w.revenue - data[i - 1].revenue) / data[i - 1].revenue) * 100),
  }));

  res.json({ weeks: withGrowth });
});

export const getPeakHours = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query  = (req as any).query as Record<string, string>;
  const period = query.period ?? "month";
  const date   = query.date;

  const today = todayStr();
  const month = monthStr();
  const year  = yearStr();

  let dateFilter: Record<string, unknown>;
  if (period === "day") {
    dateFilter = { date: date ?? today };
  } else if (period === "week") {
    const start = new Date(); start.setDate(start.getDate() - 6);
    dateFilter = { date: { $gte: start.toISOString().split("T")[0], $lte: today } };
  } else if (period === "year") {
    dateFilter = { date: { $regex: `^${year}` } };
  } else {
    dateFilter = { date: { $regex: `^${month}` } };
  }

  const hourly: any[] = await Payment.aggregate([
    { $match: dateFilter },
    { $group: { _id: { $hour: "$createdAt" }, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort:  { _id: 1 } },
  ]);

  const full = Array.from({ length: 24 }, (_u: unknown, h: number) => {
    const found = (hourly as any[]).find((x: any) => (x._id as number) === h);
    return {
      hour:    h,
      revenue: (found?.revenue as number) ?? 0,
      count:   (found?.count   as number) ?? 0,
      label:   h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`,
    };
  });

  const peakByRevenue = full.reduce((best, h) => h.revenue > best.revenue ? h : best, full[0]);
  const peakByCount   = full.reduce((best, h) => h.count   > best.count   ? h : best, full[0]);

  res.json({ hours: full, peakHour: peakByRevenue, peakByCount, period });
});

export const getDeptGrowth = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const now   = new Date();
  const thisM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastM = `${lastD.getFullYear()}-${String(lastD.getMonth() + 1).padStart(2, "0")}`;

  const staffProfiles = await Staff.find().select("user department specialization").lean();
  const deptMap       = new Map<string, string>(
    (staffProfiles as any[]).map((s: any) => [String(s.user), String(s.department || s.specialization || "General")])
  );

  const aggregate = async (monthPrefix: string): Promise<Record<string, number>> => {
    const payments = await Payment.find({ date: { $regex: `^${monthPrefix}` } }).populate("doctor", "_id").lean();
    const map: Record<string, number> = {};
    for (const p of payments as any[]) {
      const docId = p.doctor ? String(p.doctor?._id ?? p.doctor) : null;
      const dept  = docId ? (deptMap.get(docId) ?? "Unassigned") : "Unassigned";
      map[dept] = (map[dept] ?? 0) + (p.amount as number);
    }
    return map;
  };

  const [thisMonth, lastMonth] = await Promise.all([aggregate(thisM), aggregate(lastM)]);
  const allDepts = new Set([...Object.keys(thisMonth), ...Object.keys(lastMonth)]);

  const result = Array.from(allDepts).map((dept: string) => {
    const current  = thisMonth[dept] ?? 0;
    const previous = lastMonth[dept] ?? 0;
    const growth   = previous === 0
      ? (current > 0 ? 100 : 0)
      : Math.round(((current - previous) / previous) * 100);
    return { department: dept, current, previous, growth };
  }).sort((a, b) => b.current - a.current);

  res.json({ departments: result, topDepartment: result[0] ?? null });
});

export const getPendingPayments = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today       = todayStr();
  const doneEntries = await Queue.find({ date: today, status: "done" })
    .populate("patient", "name phone age gender")
    .lean();

  const entryIds = (doneEntries as any[]).map((e: any) => String(e._id));
  const payments = await Payment.find({ queueEntry: { $in: entryIds } }).lean();
  const paidSet  = new Set((payments as any[]).map((p: any) => String(p.queueEntry)));

  const unpaid = (doneEntries as any[])
    .filter((e: any) => !paidSet.has(String(e._id)))
    .map((e: any) => ({
      queueEntryId: String(e._id),
      queueNumber:  e.queueNumber as number,
      patient:      e.patient,
      date:         e.date as string,
    }));

  res.json({ unpaid, totalDue: unpaid.length, totalSeen: doneEntries.length });
});

export const getAlerts = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today  = todayStr();
  const alerts: { type: "warning" | "danger" | "info"; title: string; message: string }[] = [];

  const last7: string[] = [];
  for (let i = 7; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7.push(d.toISOString().split("T")[0]);
  }

  const [todayRev, last7Rev] = await Promise.all([
    Payment.aggregate([{ $match: { date: today } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Payment.aggregate([{ $match: { date: { $in: last7 } } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
  ]);

  const todayTotal = aggTotal(todayRev);
  const avg7day    = (last7Rev[0] as any)?.count
    ? Math.round(aggTotal(last7Rev) / 7)
    : 0;

  if (avg7day > 0 && todayTotal < avg7day * 0.5) {
    alerts.push({ type: "danger",  title: "Revenue Drop Alert",    message: `Today's revenue (₹${todayTotal.toLocaleString("en-IN")}) is more than 50% below the 7-day average (₹${avg7day.toLocaleString("en-IN")}).` });
  } else if (avg7day > 0 && todayTotal < avg7day * 0.8) {
    alerts.push({ type: "warning", title: "Revenue Below Average", message: `Today's revenue is 20% below the 7-day average. Monitor closely.` });
  }
  if (avg7day > 0 && todayTotal > avg7day * 1.3) {
    alerts.push({ type: "info",    title: "Strong Revenue Day",    message: `Today's revenue is 30% above the 7-day average. Great performance!` });
  }

  const doneEntries = await Queue.find({ date: today, status: "done" }).lean();
  const paidCount   = await Payment.countDocuments({ queueEntry: { $in: (doneEntries as any[]).map((e: any) => e._id) } });
  const unpaidCount = doneEntries.length - paidCount;
  if (unpaidCount > 0) {
    alerts.push({ type: "warning", title: "Pending Payments",      message: `${unpaidCount} patient${unpaidCount > 1 ? "s" : ""} seen today have no payment recorded.` });
  }

  res.json({ alerts, generatedAt: new Date().toISOString() });
});

// GET /api/revenue/all-staff-stats — salary data for all staff roles
export const getAllStaffSalaryStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const month    = monthStr();
  const allStaff = await User.find({ role: { $ne: "admin" } }).select("_id name email role").lean();

  const doctorRevenue: any[] = await Payment.aggregate([
    { $match: { date: { $regex: `^${month}` }, doctor: { $exists: true, $ne: null } } },
    { $group: { _id: "$doctor", revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  const revenueMap = new Map<string, any>(doctorRevenue.map((r: any) => [String(r._id), r]));

  const salaryConfigs = await SalaryConfig.find({ doctor: { $in: (allStaff as any[]).map((s: any) => s._id) } });
  const salaryMap     = new Map<string, any>(salaryConfigs.map((s: any) => [String(s.doctor), s]));

  const staffProfiles = await Staff.find({ user: { $in: (allStaff as any[]).map((s: any) => s._id) } })
    .select("user department specialization").lean();
  const profileMap = new Map<string, any>((staffProfiles as any[]).map((s: any) => [String(s.user), s]));

  const stats = (allStaff as any[]).map((u: any) => {
    const id      = String(u._id);
    const rev     = revenueMap.get(id) ?? { revenue: 0, count: 0 };
    const salary  = salaryMap.get(id) as any;
    const profile = profileMap.get(id) as any;

    let payout = 0;
    if (salary) {
      if (salary.type === "fixed")           payout = salary.fixedAmount ?? 0;
      else if (salary.type === "percentage") payout = Math.round(rev.revenue * (salary.percentage ?? 0) / 100);
      else if (salary.type === "mixed") {
        payout = (salary.mixedFixed ?? 0)
          + Math.round(rev.revenue * (salary.consultationPct ?? 0) / 100);
      }
    }

    return {
      staffId:          id,
      doctorId:         id,
      name:             u.name  as string,
      role:             u.role  as string,
      department:       (profile?.department ?? profile?.specialization ?? "") as string,
      revenueGenerated: rev.revenue as number,
      patientsCount:    rev.count   as number,
      salaryType:       salary?.type            ?? null,
      fixedAmount:      salary?.fixedAmount     ?? null,
      percentage:       salary?.percentage      ?? null,
      mixedFixed:       salary?.mixedFixed      ?? null,
      consultationPct:  salary?.consultationPct ?? null,
      procedurePct:     salary?.procedurePct    ?? null,
      estimatedPayout:  payout,
    };
  });

  res.json({ staff: stats });
});