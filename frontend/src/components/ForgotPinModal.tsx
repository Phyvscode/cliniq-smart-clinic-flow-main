import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Eye, EyeOff, Check, X, ArrowLeft, Lock, RefreshCw, ShieldCheck } from "lucide-react";

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
  const [step,          setStep]          = useState<Step>("email");
  const [email,         setEmail]         = useState("");
  const [otp,           setOtp]           = useState(["", "", "", "", "", ""]);
  const [resetToken,    setResetToken]    = useState("");
  const [newPin,        setNewPin]        = useState(["", "", "", "", "", ""]);
  const [confirmPin,    setConfirmPin]    = useState(["", "", "", "", "", ""]);
  const [showNew,       setShowNew]       = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const reset = () => {
    setStep("email"); setEmail(""); setOtp(["","","","","",""]); setResetToken("");
    setNewPin(["","","","","",""]); setConfirmPin(["","","","","",""]);
    setError(""); setLoading(false); setResendCooldown(0);
    setShowNew(false); setShowConfirm(false);
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

  const stepTitles: Record<Step, string> = {
    email: "Forgot PIN", otp: "Verify Email",
    newpin: "Set New PIN", done: "PIN Reset",
  };
  const stepSubs: Record<Step, string> = {
    email: "We'll send a code to your registered email.",
    otp: `Code sent to ${email}. Expires in 20 minutes.`,
    newpin: "Choose a new 6-digit PIN.",
    done: "",
  };

  const PinRow = ({
    arr, setArr, prefix, show, setShow, label, matchState,
  }: {
    arr: string[]; setArr: (v: string[]) => void; prefix: string;
    show: boolean; setShow: (v: boolean) => void; label: string;
    matchState?: "match" | "nomatch" | null;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600">{label}</p>
        <button type="button" onClick={() => setShow(!show)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex gap-2 flex-1 justify-center">
          {arr.map((digit, i) => (
            <input key={i} id={`${prefix}-${i}`}
              type={show ? "text" : "password"} inputMode="numeric" maxLength={1} value={digit}
              onChange={e => handlePinChange(arr, setArr, i, e.target.value, prefix)}
              onKeyDown={e => handlePinKey(arr, i, e, prefix)}
              className={`w-8 h-8 text-center text-lg font-bold rounded-lg border-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none transition-all ${
                digit
                  ? matchState === "match"   ? "border-emerald-500"
                  : matchState === "nomatch" ? "border-red-400"
                  : "border-gray-900 dark:border-gray-300"
                  : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
              }`}
            />
          ))}
        </div>
      </div>
      {matchState === "nomatch" && <p className="text-xs text-red-500 mt-1.5">PINs do not match</p>}
      {matchState === "match"   && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> PINs match</p>}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="fixed inset-0 bg-black/50 z-40" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">

            <div className="bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  {step !== "email" && step !== "done" && (
                    <button onClick={() => { setStep(step === "otp" ? "email" : "otp"); setError(""); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-0.5">SECURITY</p>
                    <h2 className="text-lg font-serif text-gray-900 dark:text-white leading-tight">{stepTitles[step]}</h2>
                  </div>
                </div>
                <button onClick={handleClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress dots */}
              {step !== "done" && (
                <div className="flex items-center gap-1.5 px-6 pt-4">
                  {(["email","otp","newpin"] as Step[]).map((s, i) => {
                    const idx = ["email","otp","newpin"].indexOf(step);
                    return (
                      <div key={s} className={`h-1 rounded-full transition-all duration-300 ${
                        i === idx ? "w-8 bg-gray-900 dark:bg-white"
                        : i < idx  ? "w-4 bg-gray-300 dark:bg-gray-600"
                        :            "w-4 bg-gray-100 dark:bg-gray-800"
                      }`} />
                    );
                  })}
                </div>
              )}

              <div className="p-6">
                <AnimatePresence mode="wait">

                  {/* ── Email step ── */}
                  {step === "email" && (
                    <motion.div key="email" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                      <p className="text-sm text-gray-400 dark:text-gray-500">{stepSubs.email}</p>
                      <div>
                        <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">EMAIL ADDRESS</p>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="email" placeholder="your@email.com" value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                            className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-10 pr-4 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors" />
                        </div>
                      </div>
                      {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500">{error}</motion.p>}
                      <button onClick={() => handleSendOtp()} disabled={loading}
                        className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</> : "Send Verification Code"}
                      </button>
                    </motion.div>
                  )}

                  {/* ── OTP step ── */}
                  {step === "otp" && (
                    <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Code sent to <span className="font-medium text-gray-900 dark:text-white">{email}</span>. Expires in 20 minutes.
                      </p>
                      <div>
                        <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">VERIFICATION CODE</p>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3" onPaste={handleOtpPaste}>
                          <div className="flex gap-2 flex-1 justify-center">
                            {otp.map((digit, i) => (
                              <input key={i} ref={el => { otpRefs.current[i] = el; }}
                                type="text" inputMode="numeric" maxLength={1} value={digit}
                                onChange={e => handleOtpChange(i, e.target.value)}
                                onKeyDown={e => handleOtpKey(i, e)}
                                className={`w-8 h-8 text-center text-lg font-bold rounded-lg border-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none transition-all ${
                                  digit ? "border-gray-900 dark:border-gray-300" : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500">{error}</motion.p>}
                      <button onClick={handleVerifyOtp} disabled={loading || otp.join("").length < 6}
                        className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying…</> : "Verify Code"}
                      </button>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">Didn't receive it?</p>
                        {resendCooldown > 0
                          ? <p className="text-xs text-gray-400">Resend in {resendCooldown}s</p>
                          : <button onClick={() => handleSendOtp(true)} disabled={loading}
                              className="text-xs text-gray-600 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-white transition-colors">
                              Resend code
                            </button>}
                      </div>
                    </motion.div>
                  )}

                  {/* ── New PIN step ── */}
                  {step === "newpin" && (
                    <motion.div key="newpin" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                      <p className="text-sm text-gray-400 dark:text-gray-500">{stepSubs.newpin}</p>
                      <PinRow arr={newPin}     setArr={setNewPin}     prefix="np"  show={showNew}     setShow={setShowNew}     label="NEW PIN"     />
                      <PinRow arr={confirmPin} setArr={setConfirmPin} prefix="cfp" show={showConfirm} setShow={setShowConfirm} label="CONFIRM PIN"
                        matchState={confirmPinFull ? (pinsMatch ? "match" : "nomatch") : null} />
                      {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500">{error}</motion.p>}
                      <button onClick={handleResetPin} disabled={loading || !newPinFull || !pinsMatch}
                        className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Resetting…</> : "Set New PIN"}
                      </button>
                    </motion.div>
                  )}

                  {/* ── Done step ── */}
                  {step === "done" && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-6 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center">
                        <ShieldCheck className="w-7 h-7 text-emerald-500" />
                      </div>
                      <h3 className="font-serif text-lg text-gray-900 dark:text-white">PIN reset successfully</h3>
                      <p className="text-sm text-gray-400">You can now log in with your new PIN.</p>
                      <button onClick={handleClose}
                        className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors mt-2">
                        Back to Login
                      </button>
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
