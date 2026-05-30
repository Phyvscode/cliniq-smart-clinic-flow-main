import { Response } from "express";
import User from "../models/User";
import Staff from "../models/Staff";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { sendCredentialsEmail } from "../utils/email";

// POST /api/admin/staff
export const createStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const {
    name, email, pin, role,
    dateOfBirth, gender, address,
    specialization, qualification, licenseNumber,
    availableDays, timeStart, timeEnd, room, department,
  } = req.body;

  if (!name || !email || !pin || !role || !dateOfBirth || !gender) {
    res.status(400).json({ message: "name, email, PIN, role, dateOfBirth and gender are required" });
    return;
  }
  if (!/^\d{6}$/.test(String(pin))) {
    res.status(400).json({ message: "PIN must be exactly 6 digits" });
    return;
  }
  if (!["doctor", "reception"].includes(role)) {
    res.status(400).json({ message: "Role must be doctor or reception" });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ message: "A user with this email already exists" });
    return;
  }

  const photoUrl    = files?.photo?.[0]    ? `uploads/photos/${files.photo[0].filename}`       : undefined;
  const documentUrl = files?.document?.[0] ? `uploads/documents/${files.document[0].filename}` : undefined;

  let days: string[] = [];
  if (availableDays) {
    try { days = JSON.parse(availableDays); }
    catch { days = String(availableDays).split(",").map((d: string) => d.trim()); }
  }

  // Create user — pin field will be hashed by pre-save hook
  const user = new User({ name, email: email.toLowerCase(), password: "", role });
  user.pin   = String(pin);
  await user.save();

  await Staff.create({
    user:           user._id,
    role,
    dateOfBirth:    new Date(dateOfBirth),
    gender,
    address:        address        || "",
    photoUrl,
    documentUrl,
    specialization: specialization || undefined,
    qualification:  qualification  || undefined,
    licenseNumber:  licenseNumber  || undefined,
    availableDays:  days,
    timeStart:      timeStart      || "09:00",
    timeEnd:        timeEnd        || "17:00",
    room:           room           || undefined,
    department:     department     || undefined,
  });

  let emailSent = false;
  try {
    await sendCredentialsEmail({ to: email, name, role, email: email, pin: String(pin) });
    emailSent = true;
  } catch (emailErr) {
    console.error("Email send failed:", emailErr);
  }

  res.status(201).json({
    message: emailSent
      ? `${role === "doctor" ? "Doctor" : "Receptionist"} created and PIN emailed to ${email}`
      : `${role === "doctor" ? "Doctor" : "Receptionist"} created but email delivery failed`,
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

// GET /api/admin/staff/role/:role
export const getStaffByRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { role } = req.params;
  if (!["doctor", "reception"].includes(role)) {
    res.status(400).json({ message: "Invalid role" });
    return;
  }
  const staff = await Staff.find({ role })
    .populate("user", "name email role createdAt")
    .sort({ createdAt: -1 });
  res.json({ staff });
});

// DELETE /api/admin/staff/:userId
export const deleteStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id || req.params.userId;

  // Try finding by Staff's own _id first (frontend sends staff._id)
  const staffById = await Staff.findById(id).lean() as any;
  if (staffById) {
    if (staffById.user) await User.findByIdAndDelete(staffById.user);
    await Staff.findByIdAndDelete(id);
    res.json({ message: "Staff member deleted" });
    return;
  }

  // Fallback: maybe id is a user's _id
  const staffByUser = await Staff.findOne({ user: id }).lean() as any;
  if (staffByUser) {
    await Staff.findByIdAndDelete(staffByUser._id);
    await User.findByIdAndDelete(id);
    res.json({ message: "Staff member deleted" });
    return;
  }

  // Nothing found — still return success (already deleted)
  res.json({ message: "Staff member deleted" });
});