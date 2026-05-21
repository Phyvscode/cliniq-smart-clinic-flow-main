import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import {
  createPrescription,
  getPatientPrescriptions,
  getAllPrescriptions,
} from "../controllers/prescriptionController";
import { generateAndSend, downloadPdf } from "../controllers/prescriptionPdfController";
import { downloadLabForm }              from "../controllers/labFormController";

const router = Router();

router.use(protect);

// Create prescription (doctor only)
router.post("/", requireRole("doctor"), createPrescription);

// Get all prescriptions (admin/doctor)
router.get("/", requireRole("admin", "doctor"), getAllPrescriptions);

// Get prescriptions for a specific patient
router.get("/patient/:patientId", getPatientPrescriptions);

// Send prescription PDF via WhatsApp
router.post("/:id/send", requireRole("doctor", "admin"), generateAndSend);

// Download prescription PDF
router.get("/:id/pdf", downloadPdf);

// Download lab investigation form PDF (separate document)
router.get("/:id/lab-form", requireRole("doctor", "admin"), downloadLabForm);

export default router;