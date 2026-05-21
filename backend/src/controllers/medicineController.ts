import { Response } from "express";
import Medicine from "../models/Medicine";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

// GET /api/medicines
export const getMedicines = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const medicines = await Medicine.find().sort({ name: 1 });
  res.json({ medicines });
});

// POST /api/medicines  (admin only)
export const createMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, type } = req.body;
  if (!name || !type) {
    res.status(400).json({ message: "name and type are required" });
    return;
  }

  const existing = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existing) {
    res.status(409).json({ message: "Medicine already exists" });
    return;
  }

  const medicine = await Medicine.create({ name, type, createdBy: req.user?._id });
  res.status(201).json({ medicine });
});

// PATCH /api/medicines/:id  (admin only)
export const updateMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!medicine) {
    res.status(404).json({ message: "Medicine not found" });
    return;
  }
  res.json({ medicine });
});

// DELETE /api/medicines/:id  (admin only)
export const deleteMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const medicine = await Medicine.findByIdAndDelete(req.params.id);
  if (!medicine) {
    res.status(404).json({ message: "Medicine not found" });
    return;
  }
  res.json({ message: "Medicine deleted" });
});