import { Response } from "express";
import User, { ALL_STAFF_ROLES } from "../models/User";
import Staff from "../models/Staff";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { sendCredentialsEmail } from "../utils/email";

const ROLE_LABELS: Record<string, string> = {
  doctor:       "Doctor",
  reception:    "Receptionist",
  lab_staff:    "Lab Staff",
  radiologist:  "Radiologist",
  nurse:        "Nurse",
  housekeeping: "Housekeeping Staff",
};

// POST /api/admin/staff
export const createStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const {
    name, email, pin, role,
    dateOfBirth, gender, address,
    specialization, qualification, licenseNumber,
    availableDays, timeStart, timeEnd, room, department,
    consultationFee,
  } = req.body;

  if (!name || !email || !pin || !role || !dateOfBirth || !gender) {
    res.status(400).json({ message: "name, email, PIN, role, dateOfBirth and gender are required" });
    return;
  }
  if (!/^\d{6}$/.test(String(pin))) {
    res.status(400).json({ message: "PIN must be exactly 6 digits" });
    return;
  }
  if (!(ALL_STAFF_ROLES as string[]).includes(role)) {
    res.status(400).json({ message: `Role must be one of: ${ALL_STAFF_ROLES.join(", ")}` });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ message: "A user with this email already exists" });
    return;
  }

  const photoUrl    = files?.photo?.[0]    ? `uploads/photos/${files.photo[0].filename}`       : undefined;
  const documentUrl = files?.document?.[0] ? `uploads/documents/${files.document[0].filename}` : undefined;

  // Normalize signature to 300x90 px
  let signatureUrl: string | undefined;
  if (files?.signature?.[0]) {
    const sigFile = files.signature[0];
    const sigPath = sigFile.path;
    const isPng   = sigFile.mimetype === "image/png";
    try {
      const sharp     = require("sharp");
      const fs        = require("fs");
      const path      = require("path");
      const finalExt  = isPng ? ".png" : ".jpg";
      const finalPath = path.join(path.dirname(sigPath), path.basename(sigPath, path.extname(sigPath)) + finalExt);
      await sharp(sigPath)
        .resize(300, 90, {
          fit:        "contain",
          background: isPng ? { r:0, g:0, b:0, alpha:0 } : { r:255, g:255, b:255 },
        })
        .toFormat(isPng ? "png" : "jpeg", { quality: 95 })
        .toFile(finalPath);
      if (finalPath !== sigPath) { try { fs.unlinkSync(sigPath); } catch {} }
      signatureUrl = `uploads/signatures/${path.basename(finalPath)}`;
    } catch (err) {
      console.warn("Signature resize failed:", (err as Error).message);
      signatureUrl = `uploads/signatures/${sigFile.filename}`;
    }
  }

  let days: string[] = [];
  if (availableDays) {
    try { days = JSON.parse(availableDays); }
    catch { days = String(availableDays).split(",").map((d: string) => d.trim()); }
  }

  const user = new User({ name, email: email.toLowerCase(), password: "", role });
  user.pin   = String(pin);
  await user.save();

  await Staff.create({
    user:            user._id,
    role,
    dateOfBirth:     new Date(dateOfBirth),
    gender,
    address:         address        || "",
    photoUrl,
    documentUrl,
    specialization:  specialization || undefined,
    qualification:   qualification  || undefined,
    licenseNumber:   licenseNumber  || undefined,
    availableDays:   days,
    timeStart:       timeStart      || "09:00",
    timeEnd:         timeEnd        || "17:00",
    room:            room           || undefined,
    department:      department     || undefined,
    consultationFee: consultationFee ? Number(consultationFee) : 0,
    signatureUrl:    signatureUrl   || undefined,
  });

  let emailSent = false;
  try {
    await sendCredentialsEmail({ to: email, name, role, email, pin: String(pin) });
    emailSent = true;
  } catch (emailErr) {
    console.error("Email send failed:", emailErr);
  }

  const label = ROLE_LABELS[role] ?? role;
  res.status(201).json({
    message: emailSent
      ? `${label} created and PIN emailed to ${email}`
      : `${label} created but email delivery failed`,
    emailSent,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/admin/staff
export const getAllStaff = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const staff = await Staff.find()
    .populate("user", "name email role createdAt")
    .sort({ createdAt: -1 });
  res.json({ staff });
});

// GET /api/admin/staff/:role
export const getStaffByRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { role } = req.params;
  if (!(ALL_STAFF_ROLES as string[]).includes(role)) {
    res.status(400).json({ message: `Invalid role. Valid: ${ALL_STAFF_ROLES.join(", ")}` });
    return;
  }
  const staff = await Staff.find({ role })
    .populate("user", "name email role createdAt")
    .sort({ createdAt: -1 });
  res.json({ staff });
});

// DELETE /api/admin/staff/:userId
export const deleteStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Staff.findOneAndDelete({ user: req.params.userId });
  await User.findByIdAndDelete(req.params.userId);
  res.json({ message: "Staff member deleted" });
});

// PATCH /api/admin/staff/:userId/fee
export const updateConsultationFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { fee } = req.body;
  if (fee === undefined || Number(fee) < 0) {
    res.status(400).json({ message: "Valid fee is required" });
    return;
  }
  const staff = await Staff.findOneAndUpdate(
    { user: req.params.userId },
    { consultationFee: Number(fee) },
    { new: true }
  ).populate("user", "name email role");
  if (!staff) { res.status(404).json({ message: "Staff not found" }); return; }
  res.json({ staff });
});