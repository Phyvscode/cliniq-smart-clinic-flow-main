import { Response } from "express";
import Bed from "../models/Bed";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

// GET /api/beds — full layout, all floors
export const getBeds = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const beds = await Bed.find()
    .populate("patient", "name age gender phone permanentCode")
    .sort({ floor: 1, bedNumber: 1 });
  res.json({ beds });
});

// POST /api/beds — admin creates a bed on a floor
export const createBed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { floor, bedNumber } = req.body;
  if (!floor?.trim() || !bedNumber?.trim()) {
    res.status(400).json({ message: "floor and bedNumber are required" });
    return;
  }

  const existing = await Bed.findOne({ floor: floor.trim(), bedNumber: bedNumber.trim() });
  if (existing) { res.status(409).json({ message: "This bed already exists on this floor" }); return; }

  const bed = await Bed.create({ floor: floor.trim(), bedNumber: bedNumber.trim() });
  res.status(201).json({ bed });
});

// DELETE /api/beds/:id — admin removes a bed (only if vacant)
export const deleteBed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const bed = await Bed.findById(req.params.id);
  if (!bed) { res.status(404).json({ message: "Bed not found" }); return; }
  if (bed.status === "occupied") {
    res.status(409).json({ message: "Cannot delete an occupied bed — vacate it first" });
    return;
  }
  await bed.deleteOne();
  res.json({ message: "Bed removed" });
});

// PATCH /api/beds/:id/assign — reception admits a patient into a bed
export const assignBed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { patientId, queueEntryId } = req.body;
  if (!patientId) { res.status(400).json({ message: "patientId is required" }); return; }

  const bed = await Bed.findById(req.params.id);
  if (!bed) { res.status(404).json({ message: "Bed not found" }); return; }
  if (bed.status === "occupied") { res.status(409).json({ message: "Bed is already occupied" }); return; }

  bed.status     = "occupied";
  bed.patient    = patientId;
  bed.queueEntry = queueEntryId || undefined;
  bed.occupiedAt = new Date();
  await bed.save();

  const populated = await bed.populate("patient", "name age gender phone permanentCode");
  res.json({ bed: populated });
});

// PATCH /api/beds/:id/vacate — manual vacate (also done automatically on queue removal/done)
export const vacateBed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const bed = await Bed.findById(req.params.id);
  if (!bed) { res.status(404).json({ message: "Bed not found" }); return; }

  bed.status     = "available";
  bed.patient    = undefined;
  bed.queueEntry = undefined;
  bed.occupiedAt = undefined;
  bed.vacatedAt  = new Date();
  await bed.save();

  res.json({ bed });
});
