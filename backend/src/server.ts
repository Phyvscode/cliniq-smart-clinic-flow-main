import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";

import connectDB from "./config/db";
import { errorHandler } from "./middleware/errorHandler";

// Register models first
import "./models/User";
import "./models/Patient";
import "./models/Medicine";
import "./models/Queue";
import "./models/Prescription";
import "./models/Staff";
import "./models/PasswordReset";

// Routes
import authRoutes from "./routes/authRoutes";
import patientRoutes from "./routes/patientRoutes";
import queueRoutes from "./routes/queueRoutes";
import prescriptionRoutes from "./routes/prescriptionRoutes";
import medicineRoutes from "./routes/medicineRoutes";
import adminRoutes from "./routes/adminRoutes";
import pharmacyRoutes from "./routes/pharmacyRoutes";

const app = express();

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// CORS — allow all origins temporarily
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

// Root route
app.get("/", (_req, res) => {
  res.send("Backend running");
});

// Health route
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pharmacy", pharmacyRoutes);

// Error handler
app.use(errorHandler);

// Port
const PORT = Number(process.env.PORT) || 5000;

// Start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });