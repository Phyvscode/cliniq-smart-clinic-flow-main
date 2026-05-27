import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import mongoose from "mongoose";

import connectDB from "./config/db";
import { errorHandler } from "./middleware/errorHandler";

// ── Register models ───────────────────────────────────────────────────────────
import "./models/User";
import "./models/Patient";
import "./models/Medicine";
import "./models/Queue";
import "./models/Prescription";
import "./models/Staff";
import "./models/PasswordReset";
import "./models/SalaryConfig";

// ── Routes ────────────────────────────────────────────────────────────────────
import authRoutes         from "./routes/authRoutes";
import patientRoutes      from "./routes/patientRoutes";
import queueRoutes        from "./routes/queueRoutes";
import prescriptionRoutes from "./routes/prescriptionRoutes";
import medicineRoutes     from "./routes/medicineRoutes";
import adminRoutes        from "./routes/adminRoutes";
import pharmacyRoutes     from "./routes/pharmacyRoutes";
import revenueRoutes      from "./routes/revenueRoutes";
import salaryRoutes       from "./routes/salaryRoutes";

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.ADMIN_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://localhost:3000",
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin))
      return callback(null, true);
    callback(null, true); // allow all for now — tighten after testing
  },
  credentials: true,
  methods:     ["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

app.options("*", cors({ origin: true, credentials: true }));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── Health / root ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("ClinIQ Backend running"));
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date() }));

// ── Tier endpoint (inline — no separate route file needed) ───────────────────
import TierConfig from "./models/TierConfig";
import { protect, requireRole } from "./middleware/auth";
import { AuthRequest }          from "./middleware/auth";
import { asyncHandler }         from "./middleware/errorHandler";

const TIER_FEATURES: Record<number, string[]> = {
  0: [],
  1: ["revenue_dashboard","patient_count_today","doctor_list","salary_management",
      "transaction_history","staff_management"],
  2: ["revenue_dashboard","patient_count_today","doctor_list","salary_management",
      "transaction_history","staff_management","advanced_analytics",
      "appointment_booking","lab_reports"],
  3: ["revenue_dashboard","patient_count_today","doctor_list","salary_management",
      "transaction_history","staff_management","advanced_analytics",
      "appointment_booking","lab_reports","weekly_trend","peak_hours",
      "dept_growth","pending_payments","smart_alerts","advanced_salary","export_reports"],
};

// GET /api/tier
app.get("/api/tier", protect, asyncHandler(async (_req: AuthRequest, res) => {
  const config = await TierConfig.findOne();
  const tier   = config?.tier ?? 0;
  res.json({ tier, features: TIER_FEATURES[tier] ?? [] });
}));

// POST /api/tier
app.post("/api/tier", protect, requireRole("admin"), asyncHandler(async (req: AuthRequest, res) => {
  const { tier, notes } = req.body;
  if (![0,1,2,3].includes(Number(tier))) {
    res.status(400).json({ message: "tier must be 0, 1, 2, or 3" }); return;
  }
  const config = await TierConfig.findOneAndUpdate(
    {},
    { tier: Number(tier), notes: notes || "", updatedAt: new Date() },
    { upsert: true, new: true }
  );
  res.status(201).json({ tier: config.tier, features: TIER_FEATURES[config.tier] ?? [] });
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/patients",      patientRoutes);
app.use("/api/queue",         queueRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/medicines",     medicineRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/pharmacy",      pharmacyRoutes);
app.use("/api/revenue",       revenueRoutes);
app.use("/api/salary",        salaryRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀  Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌  Database connection failed:", err);
    process.exit(1);
  });