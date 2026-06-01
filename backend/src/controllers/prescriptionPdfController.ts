import { Response } from "express";
import path from "path";
import fs from "fs";
import Prescription from "../models/Prescription";
import Staff from "../models/Staff";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { generatePrescriptionPdf } from "../utils/generatePrescriptionPdf";
import twilio from "twilio";

// Calculate age from dateOfBirth
const calcAge = (dob: any): number => {
  if (!dob) return 0;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// Sanitize phone → E.164 (Indian numbers: add +91 if missing)
const sanitizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`; // assume already has country code
};

// ── POST /api/prescriptions/:id/send ─────────────────────────────────────────
export const generateAndSend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Fetch prescription with populated fields
  const rx = await Prescription
    .findById(id)
    .populate("patient")
    .populate("doctor", "name");

  if (!rx) {
    res.status(404).json({ message: "Prescription not found" });
    return;
  }

  const patient = rx.patient as any;
  const doctor  = rx.doctor  as any;

  // Get doctor's staff profile (for specialization, address, etc.)
  const staffProfile = await Staff.findOne({ user: doctor._id });

  const patientAge    = patient.dateOfBirth ? calcAge(patient.dateOfBirth) : (patient.age ?? 0);
  const patientPhone  = patient.phone || "";

  if (!patientPhone) {
    res.status(400).json({ message: "Patient has no phone number on record" });
    return;
  }

  // ── Build prescription data ─────────────────────────────────────────────────
  const prescData = {
    doctorName:      doctor.name,
    specialization:  staffProfile?.specialization,
    qualification:   staffProfile?.qualification,
    address:         staffProfile?.address,
    licenseNumber:   staffProfile?.licenseNumber,
    patientName:     patient.name,
    patientAge,
    patientGender:   patient.gender,
    date:            rx.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    complaints:      (rx as any).complaints || rx.problems || [],
    investigations:  (rx as any).investigations || [],
    diagnoses:       (rx as any).diagnoses || [],
    problems:        rx.problems || [],
    medicines:       rx.medicines.map((m: any) => ({
      name:        m.medicineName || m.name,
      morning:     m.morning,
      afternoon:   m.afternoon,
      evening:     m.evening,
      night:       m.night,
      durationDays: m.durationDays,
      instructions: m.instructions,
    })),
    notes: rx.notes,
  };

  // ── Generate PDF ────────────────────────────────────────────────────────────
  const filename = `prescription_${id}_${Date.now()}.pdf`;
  const pdfPath  = await generatePrescriptionPdf(prescData, filename);
  const pdfUrl   = `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/prescriptions/${filename}`;

  // ── Send WhatsApp via Twilio ────────────────────────────────────────────────
  let whatsappSent = false;
  let whatsappError = "";

  const twilioSid   = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom  = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const client = twilio(twilioSid, twilioToken);
      const toNumber = sanitizePhone(patientPhone);

      // Text message with prescription summary
      const medicineText = prescData.medicines
        .map((m, i) => `${i + 1}. ${m.name} — ${[m.morning && "Morning", m.afternoon && "Afternoon", m.evening && "Evening", m.night && "Night"].filter(Boolean).join(", ")} · ${m.durationDays} days`)
        .join("\n");

      const messageBody = `
*ClinIQ Prescription*
──────────────────
*Patient:* ${prescData.patientName}
*Date:* ${prescData.date}
*Doctor:* Dr. ${prescData.doctorName}${prescData.specialization ? ` (${prescData.specialization})` : ""}

*Medications:*
${medicineText}
${prescData.notes ? `\n*Note:* ${prescData.notes}` : ""}
──────────────────
Your prescription PDF is attached above.
      `.trim();

      // Send PDF as media attachment
      await client.messages.create({
        from:     twilioFrom,
        to:       `whatsapp:${toNumber}`,
        body:     messageBody,
        mediaUrl: [pdfUrl],
      });

      whatsappSent = true;
    } catch (err: any) {
      console.error("WhatsApp send error:", err.message);
      whatsappError = err.message;
    }
  } else {
    whatsappError = "Twilio not configured — PDF generated but not sent";
  }

  res.json({
    message:      whatsappSent
      ? `Prescription sent to ${patientPhone} via WhatsApp`
      : `Prescription PDF generated${whatsappError ? ` (WhatsApp: ${whatsappError})` : ""}`,
    pdfUrl,
    whatsappSent,
    whatsappError: whatsappError || null,
  });
});

// ── GET /api/prescriptions/:id/pdf ────────────────────────────────────────────
// Just regenerate and return the PDF (for download)
export const downloadPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const rx = await Prescription
    .findById(id)
    .populate("patient")
    .populate("doctor", "name");

  if (!rx) { res.status(404).json({ message: "Prescription not found" }); return; }

  const patient      = rx.patient as any;
  const doctor       = rx.doctor  as any;
  const staffProfile = await Staff.findOne({ user: doctor._id });
  const patientAge   = patient.dateOfBirth ? calcAge(patient.dateOfBirth) : (patient.age ?? 0);

  const prescData = {
    doctorName:     doctor.name,
    specialization: staffProfile?.specialization,
    qualification:  staffProfile?.qualification,
    address:        staffProfile?.address,
    licenseNumber:  staffProfile?.licenseNumber,
    patientName:    patient.name,
    patientAge,
    patientGender:  patient.gender,
    date:           rx.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    complaints:     (rx as any).complaints || rx.problems || [],
    investigations: (rx as any).investigations || [],
    diagnoses:      (rx as any).diagnoses || [],
    problems:       rx.problems || [],
    medicines:      rx.medicines.map((m: any) => ({
      name:        m.medicineName || m.name,
      morning:     m.morning,
      afternoon:   m.afternoon,
      evening:     m.evening,
      night:       m.night,
      durationDays: m.durationDays,
      instructions: m.instructions,
    })),
    notes: rx.notes,
  };

  const filename = `prescription_${id}.pdf`;
  const pdfPath  = await generatePrescriptionPdf(prescData, filename);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(pdfPath).pipe(res);
});