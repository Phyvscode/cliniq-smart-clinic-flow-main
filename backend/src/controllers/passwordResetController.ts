import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User";
import { PasswordReset, ResetAttempt } from "../models/PasswordReset";
import { sendOtpEmail } from "../utils/email";
import { asyncHandler } from "../middleware/errorHandler";

const OTP_EXPIRY_MINUTES  = 20;
const MAX_ATTEMPTS_PER_HR = 5;

const makeOtp = (): string => String(crypto.randomInt(100000, 999999));
const getIp   = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
  req.socket.remoteAddress || "unknown";

// POST /api/auth/forgot-pin  (sends OTP to reset PIN)
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ message: "Email is required" }); return; }

  const normalizedEmail = email.toLowerCase().trim();
  const ip          = getIp(req);
  const now         = new Date();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);

  const [emailAttempts, ipAttempts] = await Promise.all([
    ResetAttempt.findOne({ email: normalizedEmail, windowStart: { $gte: windowStart } }),
    ResetAttempt.findOne({ ipAddress: ip,          windowStart: { $gte: windowStart } }),
  ]);

  if ((emailAttempts?.attempts ?? 0) >= MAX_ATTEMPTS_PER_HR) {
    res.status(429).json({ message: "Too many requests. Please wait an hour." }); return;
  }
  if ((ipAttempts?.attempts ?? 0) >= MAX_ATTEMPTS_PER_HR * 3) {
    res.status(429).json({ message: "Too many requests from this device." }); return;
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (user) {
    await PasswordReset.updateMany({ email: normalizedEmail, used: false }, { used: true });
    const otp    = makeOtp();
    const hash   = await bcrypt.hash(otp, 10);
    const expiry = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await PasswordReset.create({ email: normalizedEmail, otpHash: hash, expiresAt: expiry, used: false, ipAddress: ip });
    try {
      await sendOtpEmail(normalizedEmail, user.name, otp);
    } catch (err) {
      console.error("OTP email failed:", err);
      res.status(500).json({ message: "Could not send email. Check SMTP config." }); return;
    }
  }

  await ResetAttempt.findOneAndUpdate(
    { email: normalizedEmail, windowStart: { $gte: windowStart } },
    { $inc: { attempts: 1 }, $setOnInsert: { ipAddress: ip, windowStart: now } },
    { upsert: true, new: true },
  );

  res.json({ message: "If this email is registered, a verification code has been sent." });
});

// POST /api/auth/verify-otp
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) { res.status(400).json({ message: "Email and OTP are required" }); return; }
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();
  const record = await PasswordReset.findOne({
    email: normalizedEmail, used: false, expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });
  if (!record) { res.status(400).json({ message: "Invalid or expired code." }); return; }
  const isMatch = await bcrypt.compare(String(otp), record.otpHash);
  if (!isMatch) { res.status(400).json({ message: "Incorrect verification code." }); return; }
  res.json({ message: "Code verified", resetToken: record._id, email: normalizedEmail });
});

// POST /api/auth/reset-pin  (set new PIN after OTP verified)
export const resetPin = asyncHandler(async (req: Request, res: Response) => {
  const { email, resetToken, newPin } = req.body;
  if (!email || !resetToken || !newPin) {
    res.status(400).json({ message: "Email, reset token, and new PIN are required" }); return;
  }
  if (!/^\d{6}$/.test(String(newPin))) {
    res.status(400).json({ message: "PIN must be exactly 6 digits" }); return;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();
  const record = await PasswordReset.findById(resetToken);
  if (!record || record.email !== normalizedEmail || record.used || record.expiresAt < now) {
    res.status(400).json({ message: "Invalid or expired session. Request a new code." }); return;
  }
  record.used = true;
  await record.save();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  user.pin = String(newPin);
  await user.save();
  await PasswordReset.deleteMany({ email: normalizedEmail });
  res.json({ message: "PIN reset successfully. You can now log in." });
});

// POST /api/auth/reset-password  (admin only - keeps old flow)
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, resetToken, newPassword } = req.body;
  if (!email || !resetToken || !newPassword) {
    res.status(400).json({ message: "Email, reset token, and new password are required" }); return;
  }
  if (newPassword.length < 8)             { res.status(400).json({ message: "Password must be at least 8 characters" }); return; }
  if (!/[A-Z]/.test(newPassword))         { res.status(400).json({ message: "Password needs an uppercase letter" }); return; }
  if (!/[a-z]/.test(newPassword))         { res.status(400).json({ message: "Password needs a lowercase letter" }); return; }
  if (!/[0-9]/.test(newPassword))         { res.status(400).json({ message: "Password needs a number" }); return; }
  if (!/[^A-Za-z0-9]/.test(newPassword)) { res.status(400).json({ message: "Password needs a special character" }); return; }
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();
  const record = await PasswordReset.findById(resetToken);
  if (!record || record.email !== normalizedEmail || record.used || record.expiresAt < now) {
    res.status(400).json({ message: "Invalid or expired session." }); return;
  }
  record.used = true;
  await record.save();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  user.password = newPassword;
  await user.save();
  await PasswordReset.deleteMany({ email: normalizedEmail });
  res.json({ message: "Password reset successfully." });
});