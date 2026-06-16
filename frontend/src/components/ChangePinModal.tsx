import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lock, RefreshCw, Eye, EyeOff } from "lucide-react";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

interface Props { open: boolean; onClose: () => void; }

const ChangePinModal = ({ open, onClose }: Props) => {
  const [currentPin, setCurrentPin] = useState(["", "", "", "", "", ""]);
  const [newPin,     setNewPin]     = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const reset = () => {
    setCurrentPin(["","","","","",""]); setNewPin(["","","","","",""]);
    setConfirmPin(["","","","","",""]); setError(""); setSuccess(false);
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleChange = (
    arr: string[], setArr: (v: string[]) => void,
    index: number, value: string, prefix: string,
  ) => {
    if (!/^\d*$/.test(value)) return;
    const n = [...arr]; n[index] = value.slice(-1); setArr(n);
    if (value && index < 5) document.getElementById(`${prefix}-${index + 1}`)?.focus();
  };

  const handleKey = (arr: string[], index: number, e: React.KeyboardEvent, prefix: string) => {
    if (e.key === "Backspace" && !arr[index] && index > 0)
      document.getElementById(`${prefix}-${index - 1}`)?.focus();
  };

  const pinsMatch = newPin.join("") === confirmPin.join("") && confirmPin.join("").length === 6;

  const handleSubmit = async () => {
    const cp = currentPin.join(""); const np = newPin.join("");
    if (cp.length < 6) { setError("Enter your current PIN."); return; }
    if (np.length < 6) { setError("Enter your new PIN."); return; }
    if (!pinsMatch)    { setError("New PINs do not match."); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/auth/change-pin`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ currentPin: cp, newPin: np }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setSuccess(true);
      setTimeout(() => handleClose(), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const PinRow = ({
    arr, setArr, prefix, show, setShow, label,
  }: {
    arr: string[]; setArr: (v: string[]) => void; prefix: string;
    show: boolean; setShow: (v: boolean) => void; label: string;
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
              onChange={e => handleChange(arr, setArr, i, e.target.value, prefix)}
              onKeyDown={e => handleKey(arr, i, e, prefix)}
              className={`w-8 h-8 text-center text-lg font-bold rounded-lg border-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none transition-all ${
                digit ? "border-gray-900 dark:border-gray-300" : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
              }`}
            />
          ))}
        </div>
      </div>
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
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-1">SECURITY</p>
                  <h2 className="text-xl font-serif text-gray-900 dark:text-white">Change PIN</h2>
                </div>
                <button onClick={handleClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center mb-4">
                        <Check className="w-7 h-7 text-emerald-500" />
                      </div>
                      <h3 className="font-serif text-lg text-gray-900 dark:text-white mb-1">PIN updated</h3>
                      <p className="text-sm text-gray-400">Your PIN has been changed successfully.</p>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="space-y-4">
                      <PinRow arr={currentPin} setArr={setCurrentPin} prefix="cp"  show={showCurrent} setShow={setShowCurrent} label="CURRENT PIN"     />
                      <PinRow arr={newPin}     setArr={setNewPin}     prefix="np"  show={showNew}     setShow={setShowNew}     label="NEW PIN"         />
                      <PinRow arr={confirmPin} setArr={setConfirmPin} prefix="cfp" show={showConfirm} setShow={setShowConfirm} label="CONFIRM NEW PIN" />

                      {confirmPin.join("").length === 6 && !pinsMatch && (
                        <p className="text-xs text-red-500">PINs do not match</p>
                      )}
                      {pinsMatch && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> PINs match
                        </p>
                      )}

                      {error && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-sm text-red-500">{error}</motion.p>
                      )}

                      <div className="flex gap-3 pt-1">
                        <button onClick={handleClose}
                          className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          Cancel
                        </button>
                        <button onClick={handleSubmit}
                          disabled={loading || currentPin.join("").length < 6 || !pinsMatch}
                          className="flex-1 h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : "Change PIN"}
                        </button>
                      </div>
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

export default ChangePinModal;
