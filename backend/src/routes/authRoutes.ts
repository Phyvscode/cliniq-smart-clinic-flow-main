import { Router } from "express";
import {
  signup,
  login,
  pinLogin,
  getStaffList,
  getMe,
  changePin,
  changePassword,
} from "../controllers/authController";
import {
  sendOtp,
  verifyOtp,
  resetPin,
  resetPassword,
} from "../controllers/passwordResetController";
import { protect } from "../middleware/auth";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post("/signup",           signup);
router.post("/login",            login);
router.post("/pin-login",        pinLogin);
router.get("/staff-list",        getStaffList);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get("/me",                protect, getMe);
router.patch("/change-pin",      protect, changePin);
router.patch("/change-password", protect, changePassword);

// ── Forgot PIN / Password (OTP flow) ─────────────────────────────────────────
router.post("/forgot-pin",       sendOtp);
router.post("/forgot-password",  sendOtp);
router.post("/verify-otp",       verifyOtp);
router.post("/reset-pin",        resetPin);
router.post("/reset-password",   resetPassword);

export default router;