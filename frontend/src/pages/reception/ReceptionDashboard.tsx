import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Phone, UserCheck, CheckCircle2, ChevronDown,
  Trash2, RefreshCw, Search, UserX, ClipboardList,
  Stethoscope, IndianRupee, Banknote, CreditCard,
  Smartphone, Shield, Wallet, X, Check, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";
import { Patient } from "@/data/mockData";
import { apiUpdatePatient, apiCreatePayment } from "@/lib/api";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

// ─── Types ────────────────────────────────────────────────────────────────────
interface Doctor {
  id:              string;
  name:            string;
  specialization:  string;
  department:      string;
  consultationFee: number;
  photoUrl:        string | null;
}

type Step   = "idle" | "found" | "new";
type Tab    = "register" | "queue" | "payment" | "manage";
type Method = "cash" | "upi" | "card" | "insurance" | "other";

// ─── API helpers ──────────────────────────────────────────────────────────────
const apiLookupPhone = async (phone: string) => {
  try {
    const res = await fetch(
      `${BASE_URL}/patients/phone/${encodeURIComponent(phone.trim())}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    const data = await res.json();
    if (!res.ok) return null;
    const p = data.patient;
    if (p && p._id && !p.id) p.id = String(p._id);
    return p || null;
  } catch { return null; }
};

const apiFetchDoctors = async (): Promise<Doctor[]> => {
  try {
    const res  = await fetch(`${BASE_URL}/auth/staff-list?role=doctor`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    return (data.staff || []).map((d: any) => ({
      id:              d.id,
      name:            d.name,
      specialization:  d.specialization || "",
      department:      d.department     || "",
      consultationFee: d.consultationFee ?? 0,
      photoUrl:        d.photoUrl       || null,
    }));
  } catch { return []; }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const today = new Date(); const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const toDateInput = (val: any): string => {
  if (!val) return "";
  try { return new Date(val).toISOString().split("T")[0]; } catch { return ""; }
};

const displayAge = (patient: any): number => {
  if (patient?.dateOfBirth) return calculateAge(toDateInput(patient.dateOfBirth));
  return patient?.age ?? 0;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ─── Payment method options ───────────────────────────────────────────────────
const PAYMENT_METHODS: { key: Method; label: string; icon: React.ElementType }[] = [
  { key: "cash",      label: "Cash",      icon: Banknote   },
  { key: "upi",       label: "UPI",       icon: Smartphone },
  { key: "card",      label: "Card",      icon: CreditCard },
  { key: "insurance", label: "Insurance", icon: Shield     },
  { key: "other",     label: "Other",     icon: Wallet     },
];

// ─── Shared Payment Form (used in both Register and Collect Payment tabs) ─────
interface PaymentFormProps {
  patientName:   string;
  patientId:     string;
  doctorId?:     string;
  doctorName?:   string;
  queueEntryId?: string;
  defaultAmount: number;
  paymentType:   "consultation" | "procedure" | "follow-up" | "other";
  onSuccess:     () => void;
  onSkip?:       () => void;
  showSkip?:     boolean;
}

const PaymentForm = ({
  patientName, patientId, doctorId, doctorName,
  queueEntryId, defaultAmount, paymentType,
  onSuccess, onSkip, showSkip = false,
}: PaymentFormProps) => {
  const [consultAmount, setConsultAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : "");
  const [extraItems,    setExtraItems]    = useState<{ label: string; amount: string }[]>([]);
  const [method,        setMethod]        = useState<Method>("cash");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [done,          setDone]          = useState(false);

  const addExtraItem = () =>
    setExtraItems(p => [...p, { label: "", amount: "" }]);

  const updateExtra = (i: number, field: "label" | "amount", val: string) =>
    setExtraItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const removeExtra = (i: number) =>
    setExtraItems(p => p.filter((_, idx) => idx !== i));

  const totalAmount =
    Number(consultAmount || 0) +
    extraItems.reduce((s, e) => s + Number(e.amount || 0), 0);

  const handleSave = async () => {
    if (totalAmount <= 0) { setError("Enter at least one payment amount."); return; }
    setError(""); setLoading(true);
    try {
      const breakdown: string[] = [];
      if (Number(consultAmount) > 0)
        breakdown.push(`${paymentType === "consultation" ? "Consultation" : "Fee"}: ${fmt(Number(consultAmount))}`);
      extraItems.forEach(e => {
        if (e.label && Number(e.amount) > 0)
          breakdown.push(`${e.label}: ${fmt(Number(e.amount))}`);
      });

      await apiCreatePayment({
        patientId,
        amount:       totalAmount,
        type:         paymentType,
        method,
        notes:        breakdown.join(" | "),
        queueEntryId: queueEntryId || undefined,
        doctorId:     doctorId     || undefined,
      } as any);

      setDone(true);
      setTimeout(() => { onSuccess(); }, 1400);
    } catch (e: any) {
      setError(e.message || "Failed to record payment.");
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="font-semibold text-foreground">Payment Recorded!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {fmt(totalAmount)} collected from {patientName}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Patient info banner */}
      <div className="bg-muted/50 rounded-xl p-3 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{patientName}</p>
        {doctorName && <p className="text-xs text-muted-foreground">Dr. {doctorName}</p>}
      </div>

      {/* Base fee */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
          {paymentType === "consultation" ? "Consultation Fee (₹)" : "Amount (₹)"}
        </label>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="number" min="0" placeholder="0"
            value={consultAmount}
            onChange={e => setConsultAmount(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Extra charges */}
      {extraItems.map((item, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 items-start">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="e.g. Blood Test, X-Ray, ECG, Urine Test…"
              value={item.label}
              onChange={e => updateExtra(i, "label", e.target.value)}
              className="h-10 rounded-xl text-sm"
            />
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="number" min="0" placeholder="Amount (₹)"
                value={item.amount}
                onChange={e => updateExtra(i, "amount", e.target.value)}
                className="pl-8 h-10 rounded-xl text-sm"
              />
            </div>
          </div>
          <button onClick={() => removeExtra(i)}
            className="w-8 h-8 mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}

      <button onClick={addExtraItem}
        className="flex items-center gap-2 text-xs text-primary hover:underline font-medium">
        <Plus className="w-3.5 h-3.5" />
        Add test / procedure charge
      </button>

      {/* Total */}
      {totalAmount > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="text-lg font-bold text-primary">{fmt(totalAmount)}</span>
        </div>
      )}

      {/* Payment method */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Payment Method
        </label>
        <div className="flex gap-2 flex-wrap">
          {PAYMENT_METHODS.map(m => (
            <button key={m.key} onClick={() => setMethod(m.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border-2 font-medium transition-all ${
                method === m.key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}>
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        {showSkip && onSkip && (
          <Button variant="outline" onClick={onSkip} className="flex-1 h-11 rounded-xl text-sm">
            Skip
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={loading || totalAmount <= 0}
          className="flex-1 h-11 rounded-xl text-sm"
        >
          {loading ? "Saving…" : `Collect ${totalAmount > 0 ? fmt(totalAmount) : ""}`}
        </Button>
      </div>
    </div>
  );
};

// ─── Payment Modal (used after adding patient to queue) ───────────────────────
interface PaymentModalProps {
  open:          boolean;
  onClose:       () => void;
  patientName:   string;
  patientId:     string;
  doctorId:      string;
  doctorName:    string;
  queueEntryId:  string;
  defaultAmount: number;
}

const PaymentModal = ({
  open, onClose, patientName, patientId,
  doctorId, doctorName, queueEntryId, defaultAmount,
}: PaymentModalProps) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="fixed inset-0 bg-black/50 z-40" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1,  y: 0  }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Collect Payment</h2>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <PaymentForm
                patientName={patientName}
                patientId={patientId}
                doctorId={doctorId}
                doctorName={doctorName}
                queueEntryId={queueEntryId}
                defaultAmount={defaultAmount}
                paymentType="consultation"
                onSuccess={onClose}
                onSkip={onClose}
                showSkip
              />
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ─── Register Tab ─────────────────────────────────────────────────────────────
const RegisterTab = () => {
  const { findPatientByPhone, addPatient, addToQueue } = useClinic();

  const [doctors,      setDoctors]      = useState<Doctor[]>([]);
  const [selectedDoc,  setSelectedDoc]  = useState<Doctor | null>(null);
  const [docDropOpen,  setDocDropOpen]  = useState(false);
  const [phone,        setPhone]        = useState("");
  const [step,         setStep]         = useState<Step>("idle");
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [name,         setName]         = useState("");
  const [dob,          setDob]          = useState("");
  const [gender,       setGender]       = useState<"Male" | "Female" | "Other" | "">("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [payModal,     setPayModal]     = useState({
    open: false, patientName: "", patientId: "", queueEntryId: "", defaultAmount: 0,
  });

  useEffect(() => { apiFetchDoctors().then(setDoctors); }, []);

  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 120}-01-01`;

  const handlePhoneLookup = async () => {
    const trimmed = phone.trim();
    if (trimmed.length < 7) return;
    setError("");
    const existing = await apiLookupPhone(trimmed);
    if (existing) { setFoundPatient(existing); setStep("found"); }
    else          { setFoundPatient(null);     setStep("new");   }
  };

  const resetForm = () => {
    setPhone(""); setStep("idle"); setSelectedDoc(null);
    setFoundPatient(null); setName(""); setDob(""); setGender(""); setError("");
  };

  const handleSubmit = async () => {
    if (!selectedDoc) { setError("Please select a doctor."); return; }
    setError(""); setLoading(true);
    try {
      let patient = foundPatient;
      if (!patient) {
        if (!name.trim() || !dob || !gender) {
          setError("Please fill in name, date of birth, and gender.");
          setLoading(false); return;
        }
        patient = await addPatient({
          name: name.trim(), dateOfBirth: dob,
          age: calculateAge(dob), gender, phone: phone.trim(),
          department: selectedDoc.department || selectedDoc.specialization,
          visitType: "OPD",
        } as Omit<Patient, "id">);
      }

      const entry = await addToQueue(patient.id, selectedDoc.id);
      setPayModal({
        open:          true,
        patientName:   patient.name,
        patientId:     patient.id,
        queueEntryId:  entry.id,
        defaultAmount: selectedDoc.consultationFee,
      });
      resetForm();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-1">Register Patient</h2>
        <p className="text-sm text-muted-foreground mb-8">Select a doctor, then enter the patient's phone number</p>

        {/* Doctor selector */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            Select Doctor
          </label>
          <div className="relative">
            <button type="button" onClick={() => setDocDropOpen(!docDropOpen)}
              className="w-full h-12 rounded-xl border border-border bg-card text-foreground px-3 pr-10 text-sm flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-ring">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Stethoscope className="w-3.5 h-3.5 text-primary" />
              </div>
              {selectedDoc ? (
                <div className="flex-1 text-left">
                  <span className="font-medium">Dr. {selectedDoc.name}</span>
                  {selectedDoc.specialization && (
                    <span className="text-muted-foreground"> · {selectedDoc.specialization}</span>
                  )}
                  {selectedDoc.consultationFee > 0 && (
                    <span className="text-primary ml-2 font-medium">{fmt(selectedDoc.consultationFee)}</span>
                  )}
                </div>
              ) : (
                <span className="flex-1 text-left text-muted-foreground">Select a doctor…</span>
              )}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${docDropOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {docDropOpen && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                  {doctors.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No doctors added yet. Ask admin to add doctors.
                    </div>
                  ) : doctors.map(d => (
                    <button key={d.id} type="button"
                      onClick={() => { setSelectedDoc(d); setDocDropOpen(false); setError(""); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left ${
                        selectedDoc?.id === d.id ? "bg-primary/5" : ""
                      }`}>
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {d.photoUrl
                          ? <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                          : <Stethoscope className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Dr. {d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.specialization || d.department || "General"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {d.consultationFee > 0
                          ? <p className="text-sm font-semibold text-primary">{fmt(d.consultationFee)}</p>
                          : <p className="text-xs text-muted-foreground">No fee set</p>}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {docDropOpen && <div className="fixed inset-0 z-40" onClick={() => setDocDropOpen(false)} />}
        </div>

        {/* Phone */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            Patient Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="tel" placeholder="Enter phone number…" value={phone}
              onChange={e => { setPhone(e.target.value); setStep("idle"); setFoundPatient(null); }}
              onBlur={handlePhoneLookup}
              onKeyDown={e => { if (e.key === "Enter") handlePhoneLookup(); }}
              className="pl-10 h-12 rounded-xl" />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Press Enter or click away to look up</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "found" && foundPatient && (
            <motion.div key="found" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{foundPatient.name}</p>
                <p className="text-xs text-muted-foreground">
                  {displayAge(foundPatient)} yrs · {foundPatient.gender} · {foundPatient.phone}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                  ✓ Existing patient — no details needed
                </p>
              </div>
            </motion.div>
          )}

          {step === "new" && (
            <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 space-y-5">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  New patient — please fill in their details
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Full Name</label>
                <Input placeholder="Patient's full name" value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Date of Birth</label>
                <Input type="date" value={dob} min={minDate} max={maxDate} onChange={e => setDob(e.target.value)} className="h-12 rounded-xl" />
                {dob && <p className="text-xs text-primary font-medium mt-1.5">Age: {calculateAge(dob)} years old</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Male","Female","Other"] as const).map(g => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`h-12 rounded-xl border-2 text-sm font-medium transition-all ${
                        gender === g ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}>{g}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {step !== "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {selectedDoc && (
              <div className="bg-muted/50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Consultation fee</span>
                <span className="font-semibold text-foreground">
                  {selectedDoc.consultationFee > 0 ? fmt(selectedDoc.consultationFee) : "Not set"}
                </span>
              </div>
            )}
            <Button onClick={handleSubmit} disabled={loading || !selectedDoc || !phone}
              className="w-full h-12 rounded-xl text-base font-medium" size="lg">
              {loading ? "Adding to queue…" : "Add to Queue & Collect Payment"}
            </Button>
          </motion.div>
        )}
      </div>

      <PaymentModal
        open={payModal.open}
        onClose={() => setPayModal(p => ({ ...p, open: false }))}
        patientName={payModal.patientName}
        patientId={payModal.patientId}
        doctorId={selectedDoc?.id ?? ""}
        doctorName={selectedDoc?.name ?? ""}
        queueEntryId={payModal.queueEntryId}
        defaultAmount={payModal.defaultAmount}
      />
    </>
  );
};

// ─── Queue Tab ────────────────────────────────────────────────────────────────
const QueueTab = () => {
  const { queue, patients, nextPatient, removeFromQueue } = useClinic();
  const activeQueue = queue.filter(q => q.status !== "done");
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (entryId: string, patientName: string) => {
    if (!confirm(`Remove ${patientName} from the queue?`)) return;
    setRemoving(entryId);
    try { await removeFromQueue(entryId); }
    catch (err: any) { alert(err.message || "Failed to remove"); }
    finally { setRemoving(null); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{activeQueue.length} in Queue</h2>
          <p className="text-sm text-muted-foreground">Today's waiting list</p>
        </div>
        <Button onClick={nextPatient}
          disabled={!activeQueue.find(q => q.status === "in-consultation")}
          className="gap-2 rounded-xl" size="sm">
          Next Patient
        </Button>
      </div>

      <div className="space-y-2">
        {activeQueue.map((entry, i) => {
          const patient   = patients.find(p => p.id === entry.patientId);
          if (!patient) return null;
          const isCurrent = entry.status === "in-consultation";

          return (
            <motion.div key={entry.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                isCurrent ? "bg-primary/10 border-2 border-primary/30" : "bg-card border border-border"
              }`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{entry.queueNumber}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground">
                  {displayAge(patient)} yrs · {patient.gender}
                  {(entry as any).assignedDoctor?.name && (
                    <span> · Dr. {(entry as any).assignedDoctor.name}</span>
                  )}
                </p>
              </div>
              {isCurrent && (
                <span className="text-xs font-medium bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
                  Now
                </span>
              )}
              <button onClick={() => handleRemove(entry.id, patient.name)}
                disabled={removing === entry.id}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                {removing === entry.id
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </motion.div>
          );
        })}

        {activeQueue.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Queue is empty</p>
            <p className="text-sm">Add patients from the Register tab</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Collect Payment Tab ──────────────────────────────────────────────────────
// For returning patients who need to pay for tests/procedures
const CollectPaymentTab = () => {
  const [phone,        setPhone]        = useState("");
  const [searching,    setSearching]    = useState(false);
  const [patient,      setPatient]      = useState<any | null>(null);
  const [notFound,     setNotFound]     = useState(false);
  const [paymentType,  setPaymentType]  = useState<"procedure" | "follow-up" | "other">("procedure");
  const [showForm,     setShowForm]     = useState(false);
  const [successMsg,   setSuccessMsg]   = useState("");

  const VISIT_TYPES = [
    { key: "procedure"  as const, label: "Test / Procedure", desc: "Blood test, X-ray, scan, etc." },
    { key: "follow-up"  as const, label: "Follow-up Visit",  desc: "Returning for a follow-up"     },
    { key: "other"      as const, label: "Other",            desc: "Any other payment"              },
  ];

  const handleSearch = async () => {
    const trimmed = phone.trim();
    if (trimmed.length < 7) return;
    setSearching(true); setPatient(null); setNotFound(false); setShowForm(false); setSuccessMsg("");
    const result = await apiLookupPhone(trimmed);
    if (result) { setPatient(result); }
    else        { setNotFound(true);  }
    setSearching(false);
  };

  const handleSuccess = () => {
    setSuccessMsg(`Payment collected from ${patient?.name}`);
    setShowForm(false);
    setPhone("");
    setPatient(null);
    setNotFound(false);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-foreground mb-1">Collect Payment</h2>
      <p className="text-sm text-muted-foreground mb-8">
        For patients returning to pay for tests or procedures
      </p>

      {/* Success banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">{successMsg}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Payment recorded successfully</p>
            </div>
            <button onClick={() => setSuccessMsg("")}>
              <X className="w-4 h-4 text-emerald-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phone search */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Search Patient by Phone
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="tel" placeholder="Enter phone number…"
              value={phone}
              onChange={e => {
                setPhone(e.target.value);
                setPatient(null); setNotFound(false); setShowForm(false);
              }}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="pl-10 h-12 rounded-xl"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching || phone.trim().length < 7}
            className="h-12 px-5 rounded-xl gap-2">
            {searching
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
            Search
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Not found */}
        {notFound && (
          <motion.div key="notfound" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-10 text-muted-foreground">
            <UserX className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium text-foreground">Patient not found</p>
            <p className="text-sm">No patient registered with that number</p>
          </motion.div>
        )}

        {/* Found patient */}
        {patient && !showForm && (
          <motion.div key="found" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">
            {/* Patient card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground">
                  {displayAge(patient)} yrs · {patient.gender} · {patient.phone}
                </p>
              </div>
            </div>

            {/* Visit type */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Reason for Payment
              </label>
              <div className="space-y-2">
                {VISIT_TYPES.map(vt => (
                  <button key={vt.key} onClick={() => setPaymentType(vt.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      paymentType === vt.key
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${paymentType === vt.key ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    <div>
                      <p className={`text-sm font-medium ${paymentType === vt.key ? "text-primary" : "text-foreground"}`}>
                        {vt.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{vt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={() => setShowForm(true)} className="w-full h-12 rounded-xl text-base font-medium">
              Proceed to Payment
            </Button>
          </motion.div>
        )}

        {/* Payment form */}
        {patient && showForm && (
          <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">
                {VISIT_TYPES.find(v => v.key === paymentType)?.label}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground">
                ← Back
              </button>
            </div>
            <PaymentForm
              patientName={patient.name}
              patientId={patient.id || String(patient._id)}
              paymentType={paymentType}
              defaultAmount={0}
              onSuccess={handleSuccess}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Manage Tab ───────────────────────────────────────────────────────────────
const ManageTab = () => {
  const { findPatientByPhone, refreshPatients } = useClinic();

  const [searchPhone, setSearchPhone] = useState("");
  const [found,       setFound]       = useState<Patient | null>(null);
  const [searched,    setSearched]    = useState(false);
  const [name,        setName]        = useState("");
  const [dob,         setDob]         = useState("");
  const [gender,      setGender]      = useState<"Male" | "Female" | "Other" | "">("");
  const [phone,       setPhone]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState("");
  const [error,       setError]       = useState("");

  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 120}-01-01`;

  const handleSearch = () => {
    setError(""); setSuccess(""); setSearched(true);
    const patient = findPatientByPhone(searchPhone.trim());
    if (patient) {
      setFound(patient);
      setName(patient.name);
      setDob(toDateInput((patient as any).dateOfBirth));
      setGender(patient.gender);
      setPhone(patient.phone);
    } else { setFound(null); }
  };

  const handleReset = () => {
    if (!found) return;
    setName(found.name);
    setDob(toDateInput((found as any).dateOfBirth));
    setGender(found.gender);
    setPhone(found.phone);
    setError(""); setSuccess("");
  };

  const handleSave = async () => {
    if (!found) return;
    if (!name.trim() || !dob || !gender || !phone.trim()) { setError("All fields are required."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      await apiUpdatePatient(found.id, {
        name: name.trim(), dateOfBirth: dob, age: calculateAge(dob), gender, phone: phone.trim(),
      });
      await refreshPatients();
      setSuccess("Patient information updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update patient.");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-foreground mb-1">Manage Patient Info</h2>
      <p className="text-sm text-muted-foreground mb-8">Search by phone number to edit patient details</p>

      <div className="mb-6">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Search by Phone</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="tel" placeholder="Enter phone number…" value={searchPhone}
              onChange={e => { setSearchPhone(e.target.value); setSearched(false); setFound(null); }}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="pl-10 h-12 rounded-xl" />
          </div>
          <Button onClick={handleSearch} className="h-12 px-5 rounded-xl">Search</Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {searched && !found && (
          <motion.div key="notfound" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-10 text-muted-foreground">
            <UserX className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">No patient found</p>
            <p className="text-sm">No patient registered with that number</p>
          </motion.div>
        )}

        {found && (
          <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Full Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Phone Number</label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Date of Birth</label>
              <Input type="date" value={dob} min={minDate} max={maxDate} onChange={e => setDob(e.target.value)} className="h-12 rounded-xl" />
              {dob && <p className="text-xs text-primary font-medium mt-1.5">Age: {calculateAge(dob)} years old</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Male","Female","Other"] as const).map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className={`h-12 rounded-xl border-2 text-sm font-medium transition-all ${
                      gender === g ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}>{g}</button>
                ))}
              </div>
            </div>

            {error   && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{success}</p>}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={handleReset} className="flex-1 h-12 rounded-xl gap-2">
                <RefreshCw className="w-4 h-4" /> Reset Changes
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-xl">
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const ReceptionDashboard = () => {
  const { queue } = useClinic();
  const [activeTab, setActiveTab] = useState<Tab>("register");
  const activeQueue = queue.filter(q => q.status !== "done");

  const tabs = [
    { key: "register" as Tab, label: "Register",                     icon: UserCheck     },
    { key: "queue"    as Tab, label: `Queue (${activeQueue.length})`, icon: ClipboardList },
    { key: "payment"  as Tab, label: "Collect Payment",               icon: IndianRupee   },
    { key: "manage"   as Tab, label: "Manage",                        icon: RefreshCw     },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Reception Desk</h1>
            <p className="text-xs text-muted-foreground">ClinIQ</p>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{activeQueue.length} in queue</span>
      </header>

      <div className="border-b border-border bg-card px-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 overflow-y-auto h-[calc(100vh-121px)]">
        <AnimatePresence mode="wait">
          {activeTab === "register" && (
            <motion.div key="register" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <RegisterTab />
            </motion.div>
          )}
          {activeTab === "queue" && (
            <motion.div key="queue" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <QueueTab />
            </motion.div>
          )}
          {activeTab === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CollectPaymentTab />
            </motion.div>
          )}
          {activeTab === "manage" && (
            <motion.div key="manage" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ManageTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReceptionDashboard;