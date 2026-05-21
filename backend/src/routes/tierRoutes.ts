import { Router, Request, Response } from "express";
import mongoose, { Document, Schema, Model } from "mongoose";
import { protect, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ITierConfig extends Document {
  tier:      number;
  enabledBy: mongoose.Types.ObjectId;
  notes:     string;
}

// ── Feature map ───────────────────────────────────────────────────────────────
const TIER_FEATURES_MAP: Record<number, string[]> = {
  0: [],
  1: [
    "revenue_dashboard",
    "patient_count_today",
    "doctor_list",
    "salary_management",
    "transaction_history",
    "staff_management",
  ],
  2: [
    "revenue_dashboard",
    "patient_count_today",
    "doctor_list",
    "salary_management",
    "transaction_history",
    "staff_management",
    "advanced_analytics",
    "appointment_booking",
    "lab_reports",
  ],
  3: [
    "revenue_dashboard",
    "patient_count_today",
    "doctor_list",
    "salary_management",
    "transaction_history",
    "staff_management",
    "advanced_analytics",
    "appointment_booking",
    "lab_reports",
    "multi_branch",
    "insurance_claims",
    "bi_reports",
  ],
};

// ── Model (registered once, retrieved safely after) ───────────────────────────
const TierConfigSchema = new Schema<ITierConfig>(
  {
    tier:      { type: Number, enum: [1, 2, 3], required: true },
    enabledBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes:     { type: String, default: "" },
  },
  { timestamps: true }
);

// Safe registration — won't throw if already registered
const TierConfig: Model<ITierConfig> =
  (mongoose.models["TierConfig"] as Model<ITierConfig>) ||
  mongoose.model<ITierConfig>("TierConfig", TierConfigSchema);

// ── Route handlers ────────────────────────────────────────────────────────────
const router = Router();

// GET /api/tier  — no auth required so frontend can read tier on load
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const config = await TierConfig.findOne().sort({ createdAt: -1 });

    if (!config) {
      res.json({ tier: 0, features: [] });
      return;
    }

    const features = TIER_FEATURES_MAP[config.tier] ?? [];
    res.json({ tier: config.tier, features });
  })
);

// POST /api/tier  — admin only
router.post(
  "/",
  protect,
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const tierNum = Number(req.body.tier);

    if (![1, 2, 3].includes(tierNum)) {
      res.status(400).json({ message: "tier must be 1, 2, or 3" });
      return;
    }

    // Replace any existing config
    await TierConfig.deleteMany({});

    const config = await TierConfig.create({
      tier:      tierNum,
      enabledBy: (req as any).user?._id,
      notes:     req.body.notes ?? "",
    });

    const features = TIER_FEATURES_MAP[config.tier] ?? [];
    res.status(201).json({ tier: config.tier, features });
  })
);

export default router;