// PaymentCaptureModal.tsx
// Drop this after reception adds a patient to queue.
// It records the consultation fee against that queue entry.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, IndianRupee, Banknote, CreditCard, Smartphone, Shield, Wallet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiCreatePayment } from "@/lib/api";

interface Props {
  open:          boolean;
  onClose:       () => void;
  patientId:     string;
  patientName:   string;
  queueEntryId:  string;
}

const METHODS = [
  { key: "cash",      label: "Cash",      icon: Banknote },
  { key: "upi",       label: "UPI",       icon: Smartphone },
  { key: "card",      label: "Card",      icon: CreditCard },
  { key: "insurance", label: "Insurance", icon: Shield },
  { key: "other",     label: "Other",     icon: Wallet },
] as const;

const TYPES = [
  { key: "consultation", label: "Consultation" },
  { key: "follow-up",    label: "Follow-up"    },
  { key: "emergency",    label: "Emergency"    },
  { key: "procedure",    label: "Procedure"    },
] as const;

const PaymentCaptureModal = ({ open, onClose, patientId, patientName, queueEntryId }: Props) => {
  const [amount,  setAmount]  = useState("");
  const [method,  setMethod]  = useState<string>("cash");
  const [type,    setType]    = useState<string>("consultation");
  const [notes,   setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  const reset = () => {
    setAmount(""); setMethod("cash"); setType("consultation");
    setNotes(""); setError(""); setDone(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!amount || Number(amount) < 0) { setError("Enter a valid amount"); return; }
    setError(""); setLoading(true);
    try {
      await apiCreatePayment({
        patientId, amount: Number(amount),
        type, method, notes, queueEntryId,
      });
      setDone(true);
      setTimeout(handleClose, 1400);
    } catch (e: any) {
      setError(e.message || "Failed to record payment");
    } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Collect Payment</h2>
                </div>
                <button onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {done ? (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <Check className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold text-foreground">Payment Recorded</h3>
                      <p className="text-sm text-muted-foreground mt-1">₹{amount} collected from {patientName}</p>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Patient</p>
                        <p className="text-sm font-medium text-foreground">{patientName}</p>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Amount (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number" min="0" placeholder="0"
                            value={amount} onChange={e => setAmount(e.target.value)}
                            className="pl-9 h-12 text-lg font-semibold rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Visit type */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Visit Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {TYPES.map(t => (
                            <button key={t.key} onClick={() => setType(t.key)}
                              className={`py-2 rounded-xl text-sm border-2 transition-all ${
                                type === t.key
                                  ? "border-primary bg-primary/5 text-primary font-medium"
                                  : "border-border text-muted-foreground"
                              }`}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Payment method */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Payment Method
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {METHODS.map(m => (
                            <button key={m.key} onClick={() => setMethod(m.key)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border-2 transition-all ${
                                method === m.key
                                  ? "border-primary bg-primary/5 text-primary font-medium"
                                  : "border-border text-muted-foreground"
                              }`}>
                              <m.icon className="w-3.5 h-3.5" />
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Notes (optional)
                        </label>
                        <Input placeholder="e.g. Insurance claim, partial payment…"
                          value={notes} onChange={e => setNotes(e.target.value)}
                          className="h-11 rounded-xl" />
                      </div>

                      {error && <p className="text-sm text-destructive">{error}</p>}

                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" onClick={handleClose} className="flex-1 h-11 rounded-xl">
                          Skip
                        </Button>
                        <Button onClick={handleSave}
                          disabled={loading || !amount}
                          className="flex-1 h-11 rounded-xl gap-2">
                          {loading ? "Saving…" : "Record Payment"}
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

export default PaymentCaptureModal;