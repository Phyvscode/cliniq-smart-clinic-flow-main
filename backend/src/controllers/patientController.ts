import { Response } from "express";
import Patient from "../models/Patient";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

// GET /api/patients?search=
export const getPatients = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = (req.query.search as string || "").trim();
  const filter = q
    ? { $or: [
        { name:  { $regex: q, $options: "i" } },
        { phone: { $regex: q.replace(/\D/g, ""), $options: "i" } },
        { permanentCode: { $regex: q, $options: "i" } },
      ] }
    : {};
  const patients = await Patient.find(filter).sort({ createdAt: -1 }).limit(q ? 10 : 500);
  res.json({ patients });
});

// GET /api/patients/:id
export const getPatientById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) { res.status(404).json({ message: "Patient not found" }); return; }
  res.json({ patient });
});

// GET /api/patients/phone/:phone
export const getPatientByPhone = asyncHandler(async (req: AuthRequest, res: Response) => {
  const phone = req.params.phone.trim();

  // Try exact match first
  let patient = await Patient.findOne({ phone });

  if (!patient) {
    // Strip non-digits and try regex match
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length >= 7) {
      patient = await Patient.findOne({
        phone: { $regex: digitsOnly, $options: "i" },
      });
    }
  }

  res.json({ patient: patient || null });
});

// POST /api/patients
export const createPatient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, gender, phone } = req.body;

  if (!name || !gender || !phone) {
    res.status(400).json({ message: "name, gender and phone are required" });
    return;
  }

  const patient = await Patient.create({
    ...req.body,
    phone: String(phone).trim(),
    registeredBy: req.user?._id,
  });

  res.status(201).json({ patient });
});

// PATCH /api/patients/:id
export const updatePatient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true },
  );
  if (!patient) { res.status(404).json({ message: "Patient not found" }); return; }
  res.json({ patient });
});

// DELETE /api/patients/:id (admin only)
export const deletePatient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const patient = await Patient.findByIdAndDelete(req.params.id);
  if (!patient) { res.status(404).json({ message: "Patient not found" }); return; }
  res.json({ message: "Patient deleted" });
});