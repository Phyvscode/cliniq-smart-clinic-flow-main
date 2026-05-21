import { Response } from "express";
import Prescription from "../models/Prescription";
import Medicine from "../models/Medicine";
import Queue from "../models/Queue";
import Payment from "../models/Payment";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { todayString } from "../utils/generateToken";

// POST /api/prescriptions
export const createPrescription = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { patientId, diagnosis, problems, medicines, notes, referral, labTests, queueEntryId } = req.body;

  if (!patientId || !medicines || medicines.length === 0) {
    res.status(400).json({ message: "patientId and at least one medicine are required" });
    return;
  }
  if (!req.user || req.user.role !== "doctor") {
    res.status(403).json({ message: "Only doctors can create prescriptions" });
    return;
  }

  // Resolve medicine names from DB
  const medicineIds   = medicines.map((m: any) => m.medicineId);
  const medicinesDocs = await Medicine.find({ _id: { $in: medicineIds } });
  const medMap        = new Map(medicinesDocs.map(m => [String(m._id), m.name]));

  const resolvedMedicines = medicines.map((m: any) => ({
    medicine:          m.medicineId,
    medicineName:      medMap.get(m.medicineId) || "Unknown",
    morning:           m.morning           ?? false,
    afternoon:         m.afternoon         ?? false,
    evening:           m.evening           ?? false,
    night:             m.night             ?? false,
    frequencyInterval: m.frequencyInterval || null,
    dosageAmount:      m.dosageAmount      || null,
    dosageUnit:        m.dosageUnit        || null,
    durationDays:      m.durationDays,
    instructions:      m.instructions      || "",
  }));

  const prescription = await Prescription.create({
    patient:    patientId,
    doctor:     req.user._id,
    doctorName: req.user.name,
    diagnosis:  diagnosis  || '',
    problems:   problems   || [],
    medicines:  resolvedMedicines,
    notes:      notes    || "",
    referral:   referral && referral.specialist ? {
      specialist: referral.specialist,
      notes:      referral.notes || "",
    } : null,
    labTests:   labTests && labTests.tests?.length > 0 ? {
      tests: labTests.tests,
      notes: labTests.notes || "",
    } : null,
    date: todayString(),
  });

  // Mark queue entry as done if provided
  if (queueEntryId) {
    await Queue.findByIdAndUpdate(queueEntryId, { status: "done" });

    // Link doctor to payment for revenue attribution
    await Payment.updateMany(
      { queueEntry: queueEntryId },
      { $set: { doctor: req.user._id } }
    );

    // Auto-promote next waiting patient
    const today       = todayString();
    const activeCount = await Queue.countDocuments({ date: today, status: "in-consultation" });
    if (activeCount === 0) {
      await Queue.findOneAndUpdate(
        { date: today, status: "waiting" },
        { status: "in-consultation" },
        { sort: { queueNumber: 1 } },
      );
    }
  }

  res.status(201).json({ prescription });
});

// GET /api/prescriptions/patient/:patientId
export const getPatientPrescriptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const prescriptions = await Prescription.find({ patient: req.params.patientId })
    .sort({ createdAt: -1 });
  res.json({ prescriptions });
});

// GET /api/prescriptions
export const getAllPrescriptions = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const prescriptions = await Prescription.find()
    .populate("patient", "name age gender phone")
    .populate("doctor",  "name email")
    .sort({ createdAt: -1 });
  res.json({ prescriptions });
});