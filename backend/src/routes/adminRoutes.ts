import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect, requireRole } from "../middleware/auth";
import {
  createStaff,
  getAllStaff,
  getStaffByRole,
  deleteStaff,
  updateConsultationFee,
} from "../controllers/adminController";

// ── Multer setup (inline — no external import needed) ────────────────────────
const ensureDir = (dir: string) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let folder = "uploads/misc";
    if (file.fieldname === "photo")     folder = "uploads/photos";
    if (file.fieldname === "document")  folder = "uploads/documents";
    if (file.fieldname === "signature") folder = "uploads/signatures";
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB
}).fields([
  { name: "photo",     maxCount: 1 },
  { name: "document",  maxCount: 1 },
  { name: "signature", maxCount: 1 },   // ← signature added here
]);

// ── Routes ────────────────────────────────────────────────────────────────────
const router = Router();

router.use(protect, requireRole("admin"));

// Create a new staff member (doctor or receptionist)
router.post("/staff",         upload, createStaff);

// Get all staff
router.get("/staff",          getAllStaff);

// Get staff filtered by role
router.get("/staff/:role",    getStaffByRole);

// Delete a staff member
router.delete("/staff/:id",   deleteStaff);

// Update doctor consultation fee
router.patch("/staff/:id/fee",    updateConsultationFee);

export default router;