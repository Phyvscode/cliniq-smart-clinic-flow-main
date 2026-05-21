import { Router } from "express";
import {
  getPatients, getPatientById, getPatientByPhone,
  createPatient, updatePatient, deletePatient,
} from "../controllers/patientController";
import { getPatientPrescriptions } from "../controllers/prescriptionController";
import { protect, requireRole } from "../middleware/auth";

const router = Router();

router.use(protect);

router.get("/",                    getPatients);
router.get("/phone/:phone",        getPatientByPhone);
router.get("/:id",                 getPatientById);
router.get("/:id/prescriptions",   getPatientPrescriptions);
router.post("/",                   requireRole("reception", "admin"), createPatient);
router.patch("/:id",               requireRole("reception", "admin"), updatePatient);
router.delete("/:id",              requireRole("admin"),              deletePatient);

export default router;