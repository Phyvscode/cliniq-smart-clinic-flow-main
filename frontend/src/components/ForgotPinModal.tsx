import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Eye, EyeOff, Check, X, ArrowLeft, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

const apiFetch = async (path: string, body: object) => {
  const res  = await fetch(`${BASE_URL}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

type Step = "email" | "otp" | "newpin" | "done";

interface Props { open: boolean; onClose: () => void; }

const ForgotPinModal = ({ open, onClose }: Props) => {
  const [step, setStep]               = useState<Step>("email");
  const [email, setEmail]             = useState("");
  const [otp, setOtp]                 = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken]   = useState("");
  const [newPin, setNewPin]           = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin]   = useState(["", "", "", "", "", ""]);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs  = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const reset = () => {
    setStep("email"); setEmail(""); setOtp(["","","","","",""]); setResetToken("");
    setNewPin(["","","","","",""]); setConfirmPin(["","","","","",""]);
    setError(""); setLoading(false); setResendCooldown(0);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSendOtp = async (isResend = false) => {
    if (!email.trim()) { setError("Please enter your email."); return; }
    setError(""); setLoading(true);
    try {
      await apiFetch("/auth/forgot-pin", { email: email.trim() });
      if (!isResend) setStep("otp");
      setResendCooldown(60);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const n = [...otp]; n[index] = value.slice(-1); setOtp(n);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKey = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const n = ["","","","","",""];
    p.split("").forEach((ch, i) => { if (i < 6) n[i] = ch; });
    setOtp(n);
    const next = n.findIndex(v => !v);
    otpRefs.current[next === -1 ? 5 : next]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter all 6 digits."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiFetch("/auth/verify-otp", { email: email.trim(), otp: code });
      setResetToken(res.resetToken); setStep("newpin");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handlePinChange = (
    arr: string[], setArr: (v: string[]) => void,
    index: number, value: string, prefix: string,
  ) => {
    if (!/^\d*$/.test(value)) return;
    const n = [...arr]; n[index] = value.slice(-1); setArr(n);
    if (value && index < 5) document.getElementById(`${prefix}-${index + 1}`)?.focus();
  };
  const handlePinKey = (arr: string[], index: number, e: React.KeyboardEvent, prefix: string) => {
    if (e.key === "Backspace" && !arr[index] && index > 0)
      document.getElementById(`${prefix}-${index - 1}`)?.focus();
  };

  const handleResetPin = async () => {
    const p1 = newPin.join(""); const p2 = confirmPin.join("");
    if (p1.length < 6) { setError("Enter your complete new PIN."); return; }
    if (p1 !== p2)     { setError("PINs do not match."); return; }
    setError(""); setLoading(true);
    try {
      await apiFetch("/auth/reset-pin", { email: email.trim(), resetToken, newPin: p1 });
      setStep("done");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const newPinFull     = newPin.join("").length === 6;
  const confirmPinFull = confirmPin.join("").length === 6;
  const pinsMatch      = newPin.join("") === confirmPin.join("") && confirmPinFull;

  const titles: Record<Step, string> = {
    email: "Forgot PIN", otp: "Enter Verification Code",
    newpin: "Set New PIN", done: "PIN Reset!",
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
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {step !== "done" && (
                <div className="flex justify-center gap-2 pt-4 px-6">
                  {(["email","otp","newpin"] as Step[]).map((s, i) => {
                    const idx = ["email","otp","newpin"].indexOf(step);
                    return <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-8 bg-primary" : i < idx ? "w-4 bg-primary/40" : "w-4 bg-muted"}`} />;
                  })}
                </div>
              )}

              <div className="p-6">
                <AnimatePresence mode="wait">

                  {step === "email" && (
                    <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <p className="text-sm text-muted-foreground">Enter the email address registered by your admin. We'll send you a 6-digit verification code.</p>
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

                  {step === "otp" && (
                    <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <p className="text-sm text-muted-foreground">Code sent to <span className="font-medium text-foreground">{email}</span>. Expires in 20 minutes.</p>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Verification Code</label>
                        <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                          {otp.map((digit, i) => (
                            <input key={i} ref={el => { otpRefs.current[i] = el; }}
                              type="text" inputMode="numeric" maxLength={1} value={digit}
                              onChange={e => handleOtpChange(i, e.target.value)}
                              onKeyDown={e => handleOtpKey(i, e)}
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
                        <p className="text-xs text-muted-foreground mb-1">Didn't receive it?</p>
                        {resendCooldown > 0
                          ? <p className="text-xs text-muted-foreground">Resend in {resendCooldown}s</p>
                          : <button onClick={() => handleSendOtp(true)} disabled={loading} className="text-xs text-primary font-medium hover:underline">Resend code</button>}
                      </div>
                    </motion.div>
                  )}

                  {step === "newpin" && (
                    <motion.div key="newpin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <p className="text-sm text-muted-foreground">Choose a new 6-digit PIN for your account.</p>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New PIN</label>
                          <button type="button" onClick={() => setShowNew(!showNew)} className="text-xs text-muted-foreground hover:text-foreground">
                            {showNew ? "Hide" : "Show"}
                          </button>
                        </div>
                        <div className="flex gap-2 justify-between">
                          {newPin.map((digit, i) => (
                            <input key={i} id={`np-${i}`}
                              type={showNew ? "text" : "password"} inputMode="numeric" maxLength={1} value={digit}
                              onChange={e => handlePinChange(newPin, setNewPin, i, e.target.value, "np")}
                              onKeyDown={e => handlePinKey(newPin, i, e, "np")}
                              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background text-foreground focus:outline-none transition-all ${digit ? "border-primary bg-primary/5" : "border-border focus:border-primary"}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirm PIN</label>
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-xs text-muted-foreground hover:text-foreground">
                            {showConfirm ? "Hide" : "Show"}
                          </button>
                        </div>
                        <div className="flex gap-2 justify-between">
                          {confirmPin.map((digit, i) => (
                            <input key={i} id={`cp-${i}`}
                              type={showConfirm ? "text" : "password"} inputMode="numeric" maxLength={1} value={digit}
                              onChange={e => handlePinChange(confirmPin, setConfirmPin, i, e.target.value, "cp")}
                              onKeyDown={e => handlePinKey(confirmPin, i, e, "cp")}
                              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background text-foreground focus:outline-none transition-all ${
                                digit
                                  ? confirmPinFull
                                    ? pinsMatch ? "border-emerald-500 bg-emerald-500/5" : "border-destructive bg-destructive/5"
                                    : "border-primary bg-primary/5"
                                  : "border-border focus:border-primary"
                              }`}
                            />
                          ))}
                        </div>
                        {confirmPinFull && !pinsMatch && <p className="text-xs text-destructive mt-1">PINs do not match</p>}
                        {pinsMatch && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> PINs match</p>}
                      </div>

                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <Button onClick={handleResetPin} disabled={loading || !newPinFull || !pinsMatch} className="w-full h-11 rounded-xl gap-2">
                        {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Resetting...</> : "Set New PIN"}
                      </Button>
                    </motion.div>
                  )}

                  {step === "done" && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-6 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="font-bold text-foreground text-lg">PIN Reset!</h3>
                      <p className="text-sm text-muted-foreground">Your PIN has been reset. You can now log in with your new PIN.</p>
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

export default ForgotPinModal;