import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import mongoose from "mongoose";
import connectDB from "./config/db";
import { errorHandler } from "./middleware/errorHandler";

// ── Import all models first so Mongoose registers them before any route uses populate ──
import "./models/User";
import "./models/Patient";
import "./models/Medicine";
import "./models/Queue";
import "./models/Prescription";
import "./models/Staff";
import "./models/PasswordReset";

// Routes
import authRoutes         from "./routes/authRoutes";
import patientRoutes      from "./routes/patientRoutes";
import queueRoutes        from "./routes/queueRoutes";
import prescriptionRoutes from "./routes/prescriptionRoutes";
import medicineRoutes     from "./routes/medicineRoutes";
import adminRoutes        from "./routes/adminRoutes";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => res.json({ status: "ok", app: "ClinIQ API", version: "1.0.0" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth",          authRoutes);
app.use("/api/patients",      patientRoutes);
app.use("/api/queue",         queueRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/medicines",     medicineRoutes);
app.use("/api/admin",         adminRoutes);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

const startServer = (port: number) => {
  const server = app.listen(port, () => {
    // Set the actual running port so authController can build correct photo URLs
    process.env.PORT = String(port);
    console.log(`🚀  Server running on http://localhost:${port}`);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️  Port ${port} in use — trying ${port + 1}...`);
      server.close();
      startServer(port + 1);
    } else {
      console.error("❌  Server error:", err);
      process.exit(1);
    }
  });
};

const autoSeedMedicines = async () => {
  try {
    const Medicine = mongoose.model("Medicine");
    const count = await Medicine.countDocuments();
    if (count > 0) { console.log(`💊 ${count} medicines already in database`); return; }
    console.log("🌱 Seeding medicines...");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const MEDICINE_SEEDS = require("./data/medicineSeeds").default;
    await Medicine.insertMany(MEDICINE_SEEDS);
    console.log(`✅ Seeded ${MEDICINE_SEEDS.length} medicines`);
  } catch (err) {
    console.error("⚠️  Medicine seed error:", err);
  }
};

connectDB().then(async () => {
  await autoSeedMedicines();
  startServer(PORT);
});