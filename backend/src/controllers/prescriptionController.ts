import { Response } from "express";
import Prescription from "../models/Prescription";
import Medicine from "../models/Medicine";
import Queue from "../models/Queue";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { todayString } from "../utils/generateToken";

// POST /api/prescriptions
export const createPrescription = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    patientId, problems, complaints, investigations, diagnoses,
    medicines, vitals, notes, referral, labTests, queueEntryId, rxCode, followUpDate,
  } = req.body;

  if (!patientId || !medicines || medicines.length === 0) {
    res.status(400).json({ message: "patientId and at least one medicine are required" });
    return;
  }

  if (!req.user || req.user.role !== "doctor") {
    res.status(403).json({ message: "Only doctors can create prescriptions" });
    return;
  }

  // Resolve medicine names from DB (snapshot them)
  const medicineIds   = medicines.map((m: any) => m.medicineId);
  const medicinesDocs = await Medicine.find({ _id: { $in: medicineIds } });
  const medMap        = new Map(medicinesDocs.map(m => [String(m._id), m.name]));

  const resolvedMedicines = medicines.map((m: any) => ({
    medicine:          m.medicineId,
    medicineName:      medMap.get(m.medicineId) || "Unknown",
    morning:           m.morning,
    afternoon:         m.afternoon,
    evening:           m.evening,
    night:             m.night,
    durationDays:      m.durationDays,
    instructions:      m.instructions      || "",
    frequencyInterval: m.frequencyInterval || null,
    dosageAmount:      m.dosageAmount      || null,
    dosageUnit:        m.dosageUnit        || null,
  }));

  // Support both old (problems) and new (complaints + investigations + diagnoses) formats
  const allComplaints    = complaints    || problems || [];
  const allInvestigations = investigations || [];
  const allDiagnoses     = diagnoses     || [];

  const prescription = await Prescription.create({
    patient:        patientId,
    doctor:         req.user._id,
    doctorName:     req.user.name,
    complaints:     allComplaints,
    problems:       allComplaints,   // backward compat
    investigations: allInvestigations,
    diagnoses:      allDiagnoses,
    medicines:      resolvedMedicines,
    vitals:         vitals   || undefined,
    notes:          notes    || "",
    referral:       referral || null,
    labTests:       labTests || null,
    rxCode:         rxCode   || undefined,
    date:           todayString(),
    followUpDate:   followUpDate || null,
  });

  // Queue is marked done separately when doctor sends prescription via WhatsApp

  res.status(201).json({ prescription });
});

// GET /api/prescriptions/patient/:patientId
export const getPatientPrescriptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const prescriptions = await Prescription.find({ patient: req.params.patientId })
    .sort({ createdAt: -1 });
  res.json({ prescriptions });
});

// GET /api/prescriptions  (admin/doctor — all)
export const getAllPrescriptions = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const prescriptions = await Prescription.find()
    .populate("patient", "name age gender phone")
    .populate("doctor",  "name email")
    .sort({ createdAt: -1 });
  res.json({ prescriptions });
});