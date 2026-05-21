import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Check, X, ArrowLeft, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

const apiFetch = async (path: string, body: object) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

interface PwdCheck { label: string; passed: boolean; }
const validatePwd = (p: string): PwdCheck[] => [
  { label: "At least 8 characters",      passed: p.length >= 8 },
  { label: "One uppercase letter (A-Z)", passed: /[A-Z]/.test(p) },
  { label: "One lowercase letter (a-z)", passed: /[a-z]/.test(p) },
  { label: "One number (0-9)",           passed: /[0-9]/.test(p) },
  { label: "One special character",      passed: /[^A-Za-z0-9]/.test(p) },
];
const isPwdValid = (p: string) => validatePwd(p).every(c => c.passed);

type Step = "email" | "otp" | "newpwd" | "done";

interface Props { open: boolean; onClose: () => void; }

const ForgotPasswordModal = ({ open, onClose }: Props) => {
  const [step, setStep]               = useState<Step>("email");
  const [email, setEmail]             = useState("");
  const [otp, setOtp]                 = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdFocused, setPwdFocused]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const reset = () => {
    setStep("email"); setEmail(""); setOtp(["","","","","",""]);
    setResetToken(""); setNewPwd(""); setConfirmPwd("");
    setError(""); setLoading(false); setResendCooldown(0);
    setShowPwd(false); setShowConfirm(false); setPwdFocused(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSendOtp = async (isResend = false) => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError(""); setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", { email: email.trim() });
      if (!isResend) setStep("otp");
      setResendCooldown(60);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = ["","","","","",""];
    pasted.split("").forEach((ch, i) => { if (i < 6) newOtp[i] = ch; });
    setOtp(newOtp);
    const next = newOtp.findIndex(v => !v);
    otpRefs.current[next === -1 ? 5 : next]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter all 6 digits."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiFetch("/auth/verify-otp", { email: email.trim(), otp: code });
      setResetToken(res.resetToken);
      setStep("newpwd");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!isPwdValid(newPwd)) { setError("Password does not meet all requirements."); return; }
    if (newPwd !== confirmPwd) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      await apiFetch("/auth/reset-password", { email: email.trim(), resetToken, newPassword: newPwd });
      setStep("done");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const checks = validatePwd(newPwd);
  const match  = newPwd === confirmPwd && confirmPwd.length > 0;

  const titles: Record<Step, string> = {
    email: "Forgot Password", otp: "Enter Verification Code",
    newpwd: "Create New Password", done: "Password Reset!",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="fixed inset-0 bg-black/50 z-40" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  {step !== "email" && step !== "done" && (
                    <button onClick={() => { setStep(step === "otp" ? "email" : "otp"); setError(""); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all mr-1">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <KeyRound className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground">{titles[step]}</h2>
                </div>
                <button onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress */}
              {step !== "done" && (
                <div className="flex justify-center gap-2 pt-4 px-6">
                  {(["email","otp","newpwd"] as Step[]).map((s, i) => {
                    const idx = ["email","otp","newpwd"].indexOf(step);
                    return <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-8 bg-primary" : i < idx ? "w-4 bg-primary/40" : "w-4 bg-muted"}`} />;
                  })}
                </div>
              )}

              <div className="p-6">
                <AnimatePresence mode="wait">

                  {/* Step 1 — Email */}
                  {step === "email" && (
                    <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <p className="text-sm text-muted-foreground">Enter your registered email and we'll send a 6-digit verification code.</p>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="your@email.com" value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                            className="pl-10 h-11 rounded-xl" />
                        </div>
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <Button onClick={() => handleSendOtp()} disabled={loading} className="w-full h-11 rounded-xl gap-2">
                        {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</> : "Send Verification Code"}
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 2 — OTP */}
                  {step === "otp" && (
                    <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <p className="text-sm text-muted-foreground">
                        We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in 20 minutes.
                      </p>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Verification Code</label>
                        <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                          {otp.map((digit, i) => (
                            <input key={i}
                              ref={el => { otpRefs.current[i] = el; }}
                              type="text" inputMode="numeric" maxLength={1} value={digit}
                              onChange={e => handleOtpChange(i, e.target.value)}
                              onKeyDown={e => handleOtpKeyDown(i, e)}
                              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background text-foreground focus:outline-none transition-all ${digit ? "border-primary bg-primary/5" : "border-border focus:border-primary"}`}
                            />
                          ))}
                        </div>
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <Button onClick={handleVerifyOtp} disabled={loading || otp.join("").length < 6} className="w-full h-11 rounded-xl gap-2">
                        {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</> : "Verify Code"}
                      </Button>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Didn't receive the code?</p>
                        {resendCooldown > 0
                          ? <p className="text-xs text-muted-foreground">Resend in {resendCooldown}s</p>
                          : <button onClick={() => handleSendOtp(true)} disabled={loading} className="text-xs text-primary font-medium hover:underline disabled:opacity-50">Resend code</button>}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3 — New Password */}
                  {step === "newpwd" && (
                    <motion.div key="newpwd" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <p className="text-sm text-muted-foreground">Choose a strong new password for your account.</p>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showPwd ? "text" : "password"} placeholder="New password" value={newPwd}
                            onChange={e => setNewPwd(e.target.value)} onFocus={() => setPwdFocused(true)}
                            className="pl-10 pr-10 h-11 rounded-xl" />
                          <button type="button" onClick={() => setShowPwd(!showPwd)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {pwdFocused && newPwd && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="mt-2 bg-muted/50 rounded-xl p-3 space-y-1.5">
                            {checks.map(c => (
                              <div key={c.label} className="flex items-center gap-2">
                                {c.passed ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                <span className={`text-xs ${c.passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{c.label}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showConfirm ? "text" : "password"} placeholder="Re-enter password" value={confirmPwd}
                            onChange={e => setConfirmPwd(e.target.value)}
                            className={`pl-10 pr-10 h-11 rounded-xl ${confirmPwd && !match ? "border-destructive" : confirmPwd && match ? "border-emerald-500" : ""}`} />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmPwd && !match && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
                        {confirmPwd && match  && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Passwords match</p>}
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <Button onClick={handleResetPassword} disabled={loading || !isPwdValid(newPwd) || !match} className="w-full h-11 rounded-xl gap-2">
                        {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Resetting...</> : "Reset Password"}
                      </Button>
                    </motion.div>
                  )}

                  {/* Done */}
                  {step === "done" && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-6 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="font-bold text-foreground text-lg">Password Reset!</h3>
                      <p className="text-sm text-muted-foreground">Your password has been reset. You can now log in with your new password.</p>
                      <Button onClick={handleClose} className="w-full h-11 rounded-xl mt-2">Back to Login</Button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ForgotPasswordModal;