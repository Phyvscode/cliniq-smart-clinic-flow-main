import { Response } from "express";
import User from "../models/User";
import Staff from "../models/Staff";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { sendCredentialsEmail } from "../utils/email";

const ALL_STAFF_ROLES = ["doctor","reception","lab_staff","radiologist","nurse","housekeeping","pharmacist"];

const ROLE_LABELS: Record<string, string> = {
  doctor:       "Doctor",
  reception:    "Receptionist",
  lab_staff:    "Lab Staff",
  radiologist:  "Radiologist",
  nurse:        "Nurse",
  housekeeping: "Housekeeping Staff",
  pharmacist:   "Pharmacist",
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
    res.status(400).json({ message: "Name, email, PIN, role, date of birth and gender are required" });
    return;
  }
  if (!/^\d{6}$/.test(String(pin))) {
    res.status(400).json({ message: "PIN must be exactly 6 digits" });
    return;
  }
  if (!ALL_STAFF_ROLES.includes(role)) {
    res.status(400).json({ message: `Invalid role. Must be one of: ${ALL_STAFF_ROLES.join(", ")}` });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ message: "A staff member with this email already exists" });
    return;
  }

  const photoUrl    = files?.photo?.[0]    ? `uploads/photos/${files.photo[0].filename}`       : undefined;
  const documentUrl = files?.document?.[0] ? `uploads/documents/${files.document[0].filename}` : undefined;

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
      signatureUrl = `uploads/signatures/${sigFile.filename}`;
    }
  }

  let days: string[] = [];
  if (availableDays) {
    try { days = JSON.parse(availableDays); }
    catch { days = String(availableDays).split(",").map((d: string) => d.trim()); }
  }

  // Create User first
  const user = new User({ name, email: email.toLowerCase(), password: "", role });
  user.pin   = String(pin);
  await user.save();

  // Create Staff — rollback User if this fails so the email is freed
  try {
    await Staff.create({
      user:            user._id,
      role,
      dateOfBirth:     new Date(dateOfBirth),
      gender,
      address:         address        || "",
      photoUrl,
      documentUrl,
      signatureUrl,
      specialization:  specialization || undefined,
      qualification:   qualification  || undefined,
      licenseNumber:   licenseNumber  || undefined,
      availableDays:   days,
      timeStart:       timeStart      || "09:00",
      timeEnd:         timeEnd        || "17:00",
      room:            room           || undefined,
      department:      department     || undefined,
      consultationFee: consultationFee ? Number(consultationFee) : 0,
    });
  } catch (staffErr) {
    // Rollback — delete the user so email is not permanently locked
    await User.findByIdAndDelete(user._id);
    throw staffErr;
  }

  const label = ROLE_LABELS[role] ?? role;

  // Respond immediately — send email in background
  res.status(201).json({
    message:   `${label} created successfully. PIN will be emailed to ${email} shortly.`,
    emailSent: false,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });

  // Fire-and-forget email
  sendCredentialsEmail({ to: email, name, role, email, pin: String(pin) })
    .then(() => console.log(`✅ PIN emailed to ${email}`))
    .catch((err: Error) => console.error("❌ Email send failed:", err.message));
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
  if (!ALL_STAFF_ROLES.includes(role)) {
    res.status(400).json({ message: `Invalid role. Must be one of: ${ALL_STAFF_ROLES.join(", ")}` });
    return;
  }
  const staff = await Staff.find({ role })
    .populate("user", "name email role createdAt")
    .sort({ createdAt: -1 });
  res.json({ staff });
});

// DELETE /api/admin/staff/:id  (id = Staff document _id)
export const deleteStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id || req.params.userId;

  // Try by Staff _id first
  const staffById = await Staff.findById(id).lean() as any;
  if (staffById) {
    if (staffById.user) await User.findByIdAndDelete(staffById.user);
    await Staff.findByIdAndDelete(id);
    res.json({ message: "Staff member deleted" });
    return;
  }

  // Fallback: id might be a User _id
  const staffByUser = await Staff.findOne({ user: id }).lean() as any;
  if (staffByUser) {
    await Staff.findByIdAndDelete(staffByUser._id);
    await User.findByIdAndDelete(id);
  }

  res.json({ message: "Staff member deleted" });
});

// PATCH /api/admin/staff/:id/fee
export const updateConsultationFee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { fee } = req.body;
  if (fee === undefined || Number(fee) < 0) {
    res.status(400).json({ message: "Valid fee is required" });
    return;
  }
  const id    = req.params.id || req.params.userId;
  const staff = await Staff.findOneAndUpdate(
    { user: id },
    { consultationFee: Number(fee) },
    { new: true }
  ).populate("user", "name email role");
  if (!staff) { res.status(404).json({ message: "Staff not found" }); return; }
  res.json({ staff });
});

// DELETE /api/admin/cleanup-orphans
export const cleanupOrphanedUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  // Remove Staff records with no linked User
  const allStaffRecords = await Staff.find({}).lean() as any[];
  const allUserIds      = (await User.find({}).lean()).map((u: any) => String(u._id));
  const orphanStaff     = allStaffRecords.filter(
    (s: any) => !s.user || !allUserIds.includes(String(s.user))
  );
  if (orphanStaff.length > 0) {
    await Staff.deleteMany({ _id: { $in: orphanStaff.map((s: any) => s._id) } });
  }

  // Remove Users with no linked Staff
  const allStaff     = await Staff.find({}).lean();
  const staffUserIds = allStaff.map((s: any) => String(s.user)).filter(Boolean);
  const allUsers     = await User.find({ role: { $ne: "admin" } }).lean();
  const orphanUsers  = allUsers.filter((u: any) => !staffUserIds.includes(String(u._id)));
  if (orphanUsers.length > 0) {
    await User.deleteMany({ _id: { $in: orphanUsers.map((u: any) => u._id) } });
  }

  const total = orphanStaff.length + orphanUsers.length;
  res.json({
    message:      total > 0 ? `Cleaned up ${total} orphaned record(s)` : "No orphaned records found",
    deletedStaff: orphanStaff.length,
    deletedUsers: orphanUsers.length,
  });
});