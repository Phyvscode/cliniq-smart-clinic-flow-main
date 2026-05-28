/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import SalaryConfig from "../models/SalaryConfig";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

// GET /api/salary/config
export const getAllSalaryConfigs = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const configs = await SalaryConfig.find().populate("doctor", "name email").lean();
  res.json({ configs });
});

// GET /api/salary/config/:doctorId
export const getDoctorSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { doctorId } = (req as any).params as { doctorId: string };
  const config = await SalaryConfig.findOne({ doctor: doctorId })
    .populate("doctor", "name email")
    .lean();
  res.json({ config: config ?? null });
});

// POST /api/salary/config/:doctorId  — upsert
export const upsertSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { doctorId } = (req as any).params as { doctorId: string };
  const body = (req as any).body as {
    type:             string;
    fixedAmount?:     number;
    percentage?:      number;
    mixedFixed?:      number;
    consultationPct?: number;
    procedurePct?:    number;
    notes?:           string;
  };

  const { type, fixedAmount, percentage, mixedFixed, consultationPct, procedurePct, notes } = body;

  const validTypes: string[] = ["fixed", "percentage", "mixed"];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({ message: "type must be 'fixed', 'percentage', or 'mixed'" });
    return;
  }

  if (type === "fixed" && (fixedAmount === undefined || Number(fixedAmount) < 0)) {
    res.status(400).json({ message: "fixedAmount required for fixed salary" });
    return;
  }
  if (type === "percentage" && (percentage === undefined || Number(percentage) < 0 || Number(percentage) > 100)) {
    res.status(400).json({ message: "percentage (0–100) required for percentage salary" });
    return;
  }
  if (type === "mixed" && mixedFixed === undefined) {
    res.status(400).json({ message: "mixedFixed required for mixed salary" });
    return;
  }

  const ALL_STAFF_ROLES = ["doctor","reception","lab_staff","radiologist","nurse","housekeeping","pharmacist"];
  const doctor = await User.findById(doctorId).lean();
  if (!doctor || !ALL_STAFF_ROLES.includes((doctor as any).role)) {
    res.status(404).json({ message: "Staff member not found" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  // Build the update payload
  const salaryType = type as "fixed" | "percentage" | "mixed";

  // Use `any` — mongoose coerces string doctorId to ObjectId at runtime
  // would cause a TS error because string ≠ ObjectId.
  const updatePayload: any = {
    doctor:          doctorId,
    type:            salaryType,
    effectiveFrom:   today,
    notes:           notes ?? "",
    fixedAmount:     salaryType === "fixed"      ? Number(fixedAmount) : undefined,
    percentage:      salaryType === "percentage" ? Number(percentage)  : undefined,
    mixedFixed:      salaryType === "mixed"      ? Number(mixedFixed)  : undefined,
    consultationPct: salaryType === "mixed" && consultationPct !== undefined ? Number(consultationPct) : undefined,
    procedurePct:    salaryType === "mixed" && procedurePct    !== undefined ? Number(procedurePct)    : undefined,
  };

  const config = await SalaryConfig.findOneAndUpdate(
    { doctor: doctorId },
    updatePayload as any,
    { upsert: true, new: true, runValidators: true }
  ).populate("doctor", "name email").lean();

  res.json({ config });
});

// DELETE /api/salary/config/:doctorId
export const deleteSalaryConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { doctorId } = (req as any).params as { doctorId: string };
  await SalaryConfig.findOneAndDelete({ doctor: doctorId });
  res.json({ message: "Salary config removed" });
});