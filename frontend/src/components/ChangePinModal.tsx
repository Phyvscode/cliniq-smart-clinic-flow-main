import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, KeyRound, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

interface Props { open: boolean; onClose: () => void; }

const ChangePinModal = ({ open, onClose }: Props) => {
  const [currentPin, setCurrentPin]   = useState(["", "", "", "", "", ""]);
  const [newPin, setNewPin]           = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin]   = useState(["", "", "", "", "", ""]);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);

  const reset = () => {
    setCurrentPin(["","","","","",""]); setNewPin(["","","","","",""]);
    setConfirmPin(["","","","","",""]); setError(""); setSuccess(false);
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
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
        <button type="button" onClick={() => setShow(!show)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <div className="flex gap-2 justify-between">
        {arr.map((digit, i) => (
          <input key={i} id={`${prefix}-${i}`}
            type={show ? "text" : "password"} inputMode="numeric" maxLength={1} value={digit}
            onChange={e => handleChange(arr, setArr, i, e.target.value, prefix)}
            onKeyDown={e => handleKey(arr, i, e, prefix)}
            className={`w-12 h-13 text-center text-xl font-bold rounded-xl border-2 bg-background text-foreground focus:outline-none transition-all ${
              digit ? "border-primary bg-primary/5" : "border-border focus:border-primary"
            }`}
            style={{ height: "52px" }}
          />
        ))}
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
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Change PIN</h2>
                </div>
                <button onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <Check className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">PIN Changed!</h3>
                      <p className="text-sm text-muted-foreground">Your PIN has been updated successfully.</p>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="space-y-4">
                      <PinRow arr={currentPin} setArr={setCurrentPin} prefix="cp" show={showCurrent} setShow={setShowCurrent} label="Current PIN" />
                      <PinRow arr={newPin}     setArr={setNewPin}     prefix="np" show={showNew}     setShow={setShowNew}     label="New PIN"     />
                      <PinRow arr={confirmPin} setArr={setConfirmPin} prefix="cfp" show={showConfirm} setShow={setShowConfirm} label="Confirm New PIN" />

                      {confirmPin.join("").length === 6 && !pinsMatch && (
                        <p className="text-xs text-destructive">PINs do not match</p>
                      )}
                      {pinsMatch && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> PINs match
                        </p>
                      )}

                      {error && <p className="text-sm text-destructive">{error}</p>}

                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" onClick={handleClose} className="flex-1 h-11 rounded-xl">Cancel</Button>
                        <Button onClick={handleSubmit}
                          disabled={loading || currentPin.join("").length < 6 || !pinsMatch}
                          className="flex-1 h-11 rounded-xl gap-2">
                          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : "Change PIN"}
                        </Button>
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