import { Request, Response } from "express";
import User from "../models/User";
import Staff from "../models/Staff";
import { generateToken } from "../utils/generateToken";
import { asyncHandler } from "../middleware/errorHandler";

// POST /api/auth/signup  (admin only)
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ message: "All fields are required" }); return;
  }
  if (role !== "admin") {
    res.status(400).json({ message: "Signup is only for admin" }); return;
  }
  const existing = await User.findOne({ email });
  if (existing) { res.status(409).json({ message: "Email already registered" }); return; }
  const user  = await User.create({ name, email, password, role });
  const token = generateToken(user._id as any);
  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /api/auth/login  (admin email + password)
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: "Email and password required" }); return;
  }
  const user = await User.findOne({ email });
  if (!user) { res.status(401).json({ message: "Invalid email or password" }); return; }
  if (role && user.role !== role) {
    res.status(403).json({ message: `This account is not registered as ${role}` }); return;
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) { res.status(401).json({ message: "Invalid email or password" }); return; }
  const token = generateToken(user._id as any);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/pin-login  (doctor / reception)
export const pinLogin = asyncHandler(async (req: Request, res: Response) => {
  const { userId, pin } = req.body;
  if (!userId || !pin) {
    res.status(400).json({ message: "User and PIN are required" }); return;
  }
  const user = await User.findById(userId);
  if (!user) { res.status(401).json({ message: "User not found" }); return; }
  if (user.role === "admin") {
    res.status(403).json({ message: "Admins use email and password login" }); return;
  }
  const isMatch = await user.comparePin(String(pin));
  if (!isMatch) { res.status(401).json({ message: "Incorrect PIN" }); return; }
  const token = generateToken(user._id as any);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/auth/staff-list?role=doctor|reception  (public — for dropdown)
export const getStaffList = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.query;
  const ALL_ROLES = ["doctor","reception","lab_staff","radiologist","nurse","housekeeping","pharmacist","admin"];
  if (!role || !ALL_ROLES.includes(role as string)) {
    res.status(400).json({ message: "Invalid role" }); return;
  }
  const users = await User.find({ role }).select("_id name email").sort({ name: 1 });
  // Use SERVER_URL for local file serving (not BASE_URL which may be ngrok)
  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  const list = await Promise.all(
    users.map(async (u) => {
      const staff = await Staff.findOne({ user: u._id }).select("specialization department photoUrl");
      return {
        id:             String(u._id),
        name:           u.name,
        email:          u.email,
        specialization: staff?.specialization || "",
        department:     staff?.department     || "",
        photoUrl:       staff?.photoUrl ? `${serverUrl}/${staff.photoUrl}` : null,
      };
    }),
  );
  res.json({ staff: list });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// PATCH /api/auth/change-pin  (doctor / reception)
export const changePin = asyncHandler(async (req: Request, res: Response) => {
  const { currentPin, newPin } = req.body;
  const userId = (req as any).user?._id;
  if (!currentPin || !newPin) {
    res.status(400).json({ message: "Current and new PIN are required" }); return;
  }
  if (!/^\d{6}$/.test(String(newPin))) {
    res.status(400).json({ message: "PIN must be exactly 6 digits" }); return;
  }
  const user = await User.findById(userId);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  const isMatch = await user.comparePin(String(currentPin));
  if (!isMatch) { res.status(401).json({ message: "Current PIN is incorrect" }); return; }
  user.pin = String(newPin);
  await user.save();
  res.json({ message: "PIN changed successfully" });
});

// PATCH /api/auth/change-password  (admin only)
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = (req as any).user?._id;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "Current and new password are required" }); return;
  }
  if (newPassword.length < 8)             { res.status(400).json({ message: "Password must be at least 8 characters" }); return; }
  if (!/[A-Z]/.test(newPassword))         { res.status(400).json({ message: "Password needs an uppercase letter" }); return; }
  if (!/[a-z]/.test(newPassword))         { res.status(400).json({ message: "Password needs a lowercase letter" }); return; }
  if (!/[0-9]/.test(newPassword))         { res.status(400).json({ message: "Password needs a number" }); return; }
  if (!/[^A-Za-z0-9]/.test(newPassword)) { res.status(400).json({ message: "Password needs a special character" }); return; }
  const user = await User.findById(userId);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) { res.status(401).json({ message: "Current password is incorrect" }); return; }
  user.password = newPassword;
  await user.save();
  res.json({ message: "Password changed successfully" });
});