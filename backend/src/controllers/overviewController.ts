import { Response } from "express";
import Queue from "../models/Queue";
import Patient from "../models/Patient";
import Bed from "../models/Bed";
import LabOrder from "../models/LabOrder";
import OtcSale from "../models/OtcSale";
import Prescription from "../models/Prescription";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { todayString } from "../utils/generateToken";

// GET /api/overview/today — real, backend-aggregated snapshot for the admin
// Command Center. Every number here comes from an actual collection; there is
// no synthetic/mock data and no day-over-day % deltas (we don't keep daily
// history snapshots, so a "+6.6%" trend would just be invented).
export const getTodayOverview = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const today = todayString();
  const startOfDay = new Date(`${today}T00:00:00.000Z`);
  const endOfDay   = new Date(`${today}T23:59:59.999Z`);

  const [
    totalPatients, newPatients, followUpsToday, followUpsOverdue,
    doctorsOnlineIds, bedsOccupied, bedsTotal, admissions, discharges,
    labOrdersToday, otcSalesToday,
  ] = await Promise.all([
    Queue.countDocuments({ date: today }),
    Patient.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    Prescription.countDocuments({ followUpDate: today }),
    Prescription.countDocuments({ followUpDate: { $lt: today, $ne: null } }),
    Queue.distinct("doctor", { date: today, doctor: { $ne: null } }),
    Bed.countDocuments({ status: "occupied" }),
    Bed.countDocuments({}),
    Bed.countDocuments({ occupiedAt: { $gte: startOfDay, $lte: endOfDay } }),
    Bed.countDocuments({ vacatedAt: { $gte: startOfDay, $lte: endOfDay } }),
    LabOrder.find({ date: today }),
    OtcSale.find({ saleDate: today }),
  ]);

  const labTests     = labOrdersToday.reduce((s, o: any) => s + o.tests.length, 0);
  const pharmacySales = otcSalesToday.reduce((s, o: any) => s + o.grandTotal, 0);

  res.json({
    snapshot: {
      totalPatients,
      newPatients,
      existing: Math.max(0, totalPatients - newPatients),
      followUps: followUpsToday,
      followUpsOverdue,
      doctorsOnline: doctorsOnlineIds.length,
      admissions,
      discharges,
      bedsOccupied,
      bedsTotal,
      bedOccupancyPct: bedsTotal ? Math.round((bedsOccupied / bedsTotal) * 100) : 0,
      labTests,
      pharmacySales,
    },
  });
});
