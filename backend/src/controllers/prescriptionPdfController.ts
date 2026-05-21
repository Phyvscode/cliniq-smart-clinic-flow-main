import { Response } from "express";
import fs from "fs";
import Prescription from "../models/Prescription";
import Staff from "../models/Staff";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { generatePrescriptionPdf } from "../utils/generatePrescriptionPdf";
import twilio from "twilio";

const calcAge = (dob: any): number => {
  if (!dob) return 0;
  const today = new Date(); const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const sanitizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
};

// ── Build prescription data shared between send & download ────────────────────
const buildPrescData = async (rx: any) => {
  const patient      = rx.patient as any;
  const doctor       = rx.doctor  as any;
  const staffProfile = await Staff.findOne({ user: doctor._id });
  const patientAge   = patient.dateOfBirth ? calcAge(patient.dateOfBirth) : (patient.age ?? 0);

  return {
    doctorName:     doctor.name,
    signatureUrl:   staffProfile?.signatureUrl ?? undefined,
    specialization: staffProfile?.specialization,
    qualification:  staffProfile?.qualification,
    address:        staffProfile?.address,
    licenseNumber:  staffProfile?.licenseNumber,
    patientName:    patient.name,
    patientAge,
    patientGender:  patient.gender,
    date:           rx.date || new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }),
    diagnosis:      rx.diagnosis || "",
    problems:       rx.problems  || [],
    medicines:      rx.medicines.map((m: any) => ({
      name:              m.medicineName || m.name,
      morning:           m.morning,
      afternoon:         m.afternoon,
      evening:           m.evening,
      night:             m.night,
      frequencyInterval: m.frequencyInterval || null,
      dosageAmount:      m.dosageAmount      || null,
      dosageUnit:        m.dosageUnit        || null,
      durationDays:      m.durationDays,
      instructions:      m.instructions,
    })),
    notes: rx.notes,
  };
};

// ── POST /api/prescriptions/:id/send ─────────────────────────────────────────
export const generateAndSend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rx = await Prescription.findById(req.params.id)
    .populate("patient").populate("doctor", "name");

  if (!rx) { res.status(404).json({ message: "Prescription not found" }); return; }

  const patient      = rx.patient as any;
  const patientPhone = patient.phone || "";

  if (!patientPhone) {
    res.status(400).json({ message: "Patient has no phone number on record" }); return;
  }

  const prescData = await buildPrescData(rx);
  const filename  = `prescription_${req.params.id}_${Date.now()}.pdf`;
  const pdfPath   = await generatePrescriptionPdf(prescData, filename);
  const pdfUrl    = `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/prescriptions/${filename}`;

  let whatsappSent  = false;
  let whatsappError = "";

  const twilioSid   = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom  = process.env.TWILIO_WHATSAPP_FROM;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const client   = twilio(twilioSid, twilioToken);
      const toNumber = sanitizePhone(patientPhone);

      // Build frequency string for message
      const freqStr = (m: any) => {
        if (m.frequencyInterval) {
          const map: Record<string, string> = { "4h":"Every 4 hrs","6h":"Every 6 hrs","8h":"Every 8 hrs","12h":"Every 12 hrs" };
          return map[m.frequencyInterval] || m.frequencyInterval;
        }
        return [m.morning&&"Morning", m.afternoon&&"Afternoon", m.evening&&"Evening", m.night&&"Night"]
          .filter(Boolean).join(", ");
      };

      const medicineText = prescData.medicines
        .map((m: any, i: number) =>
          `${i + 1}. ${m.name}${m.dosageAmount ? ` ${m.dosageAmount}${m.dosageUnit || ""}` : ""} — ${freqStr(m)} · ${m.durationDays} days${m.instructions ? ` (${m.instructions})` : ""}`
        ).join("\n");

      const messageBody = [
        "*ClinIQ Prescription*",
        "──────────────────",
        `*Patient:* ${prescData.patientName}`,
        `*Date:* ${prescData.date}`,
        `*Doctor:* Dr. ${prescData.doctorName}${prescData.specialization ? ` (${prescData.specialization})` : ""}`,
        prescData.diagnosis ? `*Diagnosis:* ${prescData.diagnosis}` : "",
        "",
        "*Medications:*",
        medicineText,
        prescData.notes ? `\n*Note:* ${prescData.notes}` : "",
        "──────────────────",
        "Your prescription PDF is attached above.",
      ].filter(l => l !== null && l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();

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
    message:       whatsappSent
      ? `Prescription sent to ${patientPhone} via WhatsApp`
      : `Prescription PDF generated${whatsappError ? ` (WhatsApp: ${whatsappError})` : ""}`,
    pdfUrl,
    whatsappSent,
    whatsappError: whatsappError || null,
  });
});

// ── GET /api/prescriptions/:id/pdf ────────────────────────────────────────────
export const downloadPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rx = await Prescription.findById(req.params.id)
    .populate("patient").populate("doctor", "name");

  if (!rx) { res.status(404).json({ message: "Prescription not found" }); return; }

  const prescData = await buildPrescData(rx);
  const filename  = `prescription_${req.params.id}.pdf`;
  const pdfPath   = await generatePrescriptionPdf(prescData, filename);

  res.setHeader("Content-Type",        "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(pdfPath).pipe(res);
});