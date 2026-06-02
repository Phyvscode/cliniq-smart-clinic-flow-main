import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChangePinModal from "@/components/ChangePinModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Phone, UserCheck, CheckCircle2, ChevronDown,
  Trash2, RefreshCw, Search, UserX, ClipboardList, LogOut, KeyRound,
  IndianRupee, Banknote, Smartphone, CreditCard, Plus, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

const apiLookupPhone = async (phone: string) => {
  try {
    const res = await fetch(`${BASE_URL}/patients/phone/${encodeURIComponent(phone.trim())}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (!res.ok) return null;
    const p = data.patient;
    if (p && p._id && !p.id) p.id = String(p._id);
    return p || null;
  } catch { return null; }
};
import { Patient } from "@/data/mockData";
import { apiUpdatePatient } from "@/lib/api";

const apiCreatePayment = async (body: object) => {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Payment failed");
  return data;
};

const COMMON_TESTS = [
  { name: "Complete Blood Count (CBC)", fee: 300 },
  { name: "Blood Sugar Fasting",        fee: 80  },
  { name: "Blood Sugar PP",             fee: 80  },
  { name: "HbA1c",                      fee: 400 },
  { name: "Lipid Profile",              fee: 500 },
  { name: "LFT",                        fee: 600 },
  { name: "KFT",                        fee: 500 },
  { name: "Thyroid Profile (T3/T4/TSH)",fee: 700 },
  { name: "Urine Routine",              fee: 100 },
  { name: "X-Ray Chest",                fee: 300 },
  { name: "X-Ray",                      fee: 250 },
  { name: "ECG",                        fee: 200 },
  { name: "USG Abdomen",                fee: 800 },
  { name: "CT Scan",                    fee: 3000 },
  { name: "MRI",                        fee: 5000 },
  { name: "Dengue Test",                fee: 600 },
  { name: "Malaria Test",               fee: 150 },
  { name: "Typhoid (Widal)",            fee: 200 },
  { name: "Vitamin D",                  fee: 900 },
  { name: "Vitamin B12",                fee: 700 },
  { name: "CRP",                        fee: 400 },
  { name: "ESR",                        fee: 100 },
];

const PAYMENT_METHODS = [
  { key: "cash",      label: "Cash",      icon: Banknote   },
  { key: "upi",       label: "UPI",       icon: Smartphone },
  { key: "card",      label: "Card",      icon: CreditCard },
];

const DEPARTMENTS = [
  "General Medicine", "Pediatrics", "Gynecology", "Orthopedics",
  "Dermatology", "ENT", "Cardiology", "Neurology", "Ophthalmology", "Dentistry",
];

type Step = "idle" | "found" | "new";
type Tab  = "register" | "queue" | "collect" | "manage";

// Calculate age live from a "YYYY-MM-DD" string
const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// Safely format any date value to "YYYY-MM-DD" for <input type="date">
const toDateInput = (val: any): string => {
  if (!val) return "";
  try { return new Date(val).toISOString().split("T")[0]; }
  catch { return ""; }
};

// Display age: prefer calculating from dateOfBirth, fall back to stored age
const displayAge = (patient: any): number => {
  if (patient?.dateOfBirth) return calculateAge(toDateInput(patient.dateOfBirth));
  return patient?.age ?? 0;
};

// ─── Register Tab ─────────────────────────────────────────────────────────────
const RegisterTab = () => {
  const { findPatientByPhone, addPatient, addToQueue } = useClinic();

  const [department, setDepartment]     = useState("");
  // Fee collection modal state
  const [feeModal, setFeeModal]         = useState<{
    open: boolean; patientName: string; patientId: string;
    consultFee: number; mode: "consultation" | "test";
  }>({ open: false, patientName: "", patientId: "", consultFee: 0, mode: "consultation" });
  const [phone, setPhone]               = useState("");
  const [step, setStep]                 = useState<Step>("idle");
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [name, setName]                 = useState("");
  const [dob, setDob]                   = useState("");
  const [gender, setGender]             = useState<"Male" | "Female" | "Other" | "">("");
  const [loading, setLoading]           = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError]               = useState("");

  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 120}-01-01`;

  const handlePhoneLookup = async () => {
    const trimmed = phone.trim();
    if (trimmed.length < 7) return;
    setError("");
    const existing = await apiLookupPhone(trimmed);
    if (existing) {
      setFoundPatient(existing);
      setStep("found");
    } else {
      setFoundPatient(null);
      setStep("new");
    }
  };

  const resetForm = () => {
    setPhone(""); setDepartment(""); setStep("idle");
    setFoundPatient(null); setName(""); setDob(""); setGender(""); setError("");
  };

  const handleSubmit = async () => {
    if (!department) { setError("Please select a department."); return; }
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
          age: calculateAge(dob), gender,
          phone: phone.trim(), department, visitType: "OPD",
        } as Omit<Patient, "id">);
      }
      await addToQueue(patient.id, undefined, department);
      resetForm();
      setFeeModal({ open: true, patientName: patient.name, patientId: patient.id, consultFee: 0, mode: "consultation" });
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally { setLoading(false); }
  };


  // ── Fee collection modal ────────────────────────────────────────────────
  const FeeCollectionModal = () => {
    const [payMethod, setPayMethod]       = useState("cash");
    const [consultFee, setConsultFee]     = useState(feeModal.consultFee > 0 ? String(feeModal.consultFee) : "");
    const [testSearch, setTestSearch]     = useState("");
    const [selectedTests, setSelectedTests] = useState<{name:string;fee:number;custom:boolean}[]>([]);
    const [customTest, setCustomTest]     = useState("");
    const [customFee, setCustomFee]       = useState("");
    const [saving, setSaving]             = useState(false);
    const [done, setDone]                 = useState(false);

    const mode = feeModal.mode;
    const filtered = COMMON_TESTS.filter(t =>
      t.name.toLowerCase().includes(testSearch.toLowerCase()) &&
      !selectedTests.some(s => s.name === t.name)
    );
    const totalFee = mode === "consultation"
      ? Number(consultFee || 0)
      : selectedTests.reduce((s, t) => s + t.fee, 0);

    const addTest = (t: {name:string;fee:number}) =>
      setSelectedTests(prev => [...prev, { ...t, custom: false }]);
    const addCustomTest = () => {
      if (!customTest.trim()) return;
      setSelectedTests(prev => [...prev, { name: customTest.trim(), fee: Number(customFee||0), custom: true }]);
      setCustomTest(""); setCustomFee("");
    };

    const handleCollect = async () => {
      if (totalFee <= 0) { alert("Please enter a fee amount."); return; }
      setSaving(true);
      try {
        await apiCreatePayment({
          patientId: feeModal.patientId,
          amount:    totalFee,
          type:      mode === "consultation" ? "consultation" : "test",
          method:    payMethod,
          notes:     mode === "test"
            ? selectedTests.map(t => `${t.name}: ₹${t.fee}`).join(" | ")
            : `Consultation: ₹${totalFee}`,
        });
        setDone(true);
        setTimeout(() => {
          setFeeModal(f => ({ ...f, open: false }));
          setConfirmation(`${feeModal.patientName} added to queue — fee collected ✓`);
        }, 1500);
      } catch (e: any) { alert(e.message || "Payment failed"); }
      finally { setSaving(false); }
    };

    if (!feeModal.open) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}}
          className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div>
              <h2 className="font-semibold text-foreground">Collect Payment</h2>
              <p className="text-xs text-muted-foreground">{feeModal.patientName}</p>
            </div>
            <button onClick={() => { setFeeModal(f=>({...f,open:false})); setConfirmation(`${feeModal.patientName} added to queue`); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          {done ? (
            <div className="flex flex-col items-center py-12 px-5">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-semibold text-foreground">Payment Recorded!</p>
              <p className="text-sm text-muted-foreground mt-1">₹{totalFee} collected</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "consultation", label: "Consultation Fee", desc: "Doctor visit fee" },
                  { key: "test",         label: "Test / Procedure",  desc: "Lab tests, scans, etc." },
                ].map(m => (
                  <button key={m.key} onClick={() => setFeeModal(f=>({...f,mode:m.key as any}))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      mode===m.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}>
                    <p className={`text-sm font-semibold ${mode===m.key?"text-primary":"text-foreground"}`}>{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>

              {/* Consultation fee */}
              {mode === "consultation" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Consultation Fee (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" min="0" placeholder="Enter fee amount"
                      value={consultFee} onChange={e => setConsultFee(e.target.value)}
                      className="pl-9 h-11 rounded-xl" />
                  </div>
                </div>
              )}

              {/* Test selection */}
              {mode === "test" && (
                <div className="space-y-3">
                  {/* Selected tests */}
                  {selectedTests.length > 0 && (
                    <div className="space-y-2">
                      {selectedTests.map((t,i) => (
                        <div key={i} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                          <span className="flex-1 text-sm font-medium text-foreground">{t.name}</span>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="w-3 h-3 text-muted-foreground" />
                            <input type="number" min="0" value={t.fee}
                              onChange={e => setSelectedTests(prev => prev.map((x,j) => j===i ? {...x,fee:Number(e.target.value)} : x))}
                              className="w-20 h-7 text-sm text-right bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-ring" />
                          </div>
                          <button onClick={() => setSelectedTests(prev => prev.filter((_,j)=>j!==i))}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-base font-bold text-primary">₹{selectedTests.reduce((s,t)=>s+t.fee,0)}</span>
                      </div>
                    </div>
                  )}

                  {/* Search common tests */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search tests..." value={testSearch}
                      onChange={e => setTestSearch(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filtered.slice(0,8).map(t => (
                      <button key={t.name} onClick={() => addTest(t)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted transition-colors text-left">
                        <span className="text-sm text-foreground">{t.name}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IndianRupee className="w-3 h-3" />{t.fee}
                          <Plus className="w-3.5 h-3.5 text-primary ml-1" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom test */}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add Custom</p>
                    <div className="flex gap-2">
                      <Input placeholder="Test name" value={customTest}
                        onChange={e => setCustomTest(e.target.value)} className="h-9 rounded-xl text-sm flex-1" />
                      <div className="relative w-24">
                        <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input type="number" placeholder="Fee" value={customFee}
                          onChange={e => setCustomFee(e.target.value)} className="h-9 rounded-xl text-sm pl-6" />
                      </div>
                      <button onClick={addCustomTest}
                        className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                        <Plus className="w-4 h-4 text-primary-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment method */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.key} onClick={() => setPayMethod(m.key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        payMethod===m.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                      }`}>
                      <m.icon className="w-3.5 h-3.5" />{m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!done && (
            <div className="px-5 pb-5 pt-3 border-t border-border shrink-0 flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl"
                onClick={() => { setFeeModal(f=>({...f,open:false})); setConfirmation(`${feeModal.patientName} added to queue`); }}>
                Skip
              </Button>
              <Button className="flex-1 h-11 rounded-xl" disabled={saving||totalFee<=0} onClick={handleCollect}>
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : `Collect ₹${totalFee}`}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto">
      <AnimatePresence>
        {confirmation && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{confirmation}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Patient is now in the waiting list</p>
            </div>
            <button onClick={() => setConfirmation(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="text-xl font-bold text-foreground mb-1">Register Patient</h2>
      <p className="text-sm text-muted-foreground mb-8">Select department and enter phone number to begin</p>

      {/* Department */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Department
        </label>
        <div className="relative">
          <select
            value={department} onChange={e => setDepartment(e.target.value)}
            className="w-full h-12 rounded-xl border border-border bg-card text-foreground px-4 pr-10 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="">Select a department...</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Phone */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Patient Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="tel" placeholder="Enter phone number..." value={phone}
            onChange={e => { setPhone(e.target.value); setStep("idle"); setFoundPatient(null); }}
            onBlur={handlePhoneLookup}
            onKeyDown={e => { if (e.key === "Enter") handlePhoneLookup(); }}
            className="pl-10 h-12 rounded-xl"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Press Enter or click away to look up</p>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {step === "found" && foundPatient && (
          <motion.div
            key="found" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4"
          >
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
          <motion.div
            key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 space-y-5"
          >
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
              {dob && calculateAge(dob) >= 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-primary font-medium mt-1.5">
                  Age: {calculateAge(dob)} year{calculateAge(dob) !== 1 ? "s" : ""} old
                </motion.p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Male", "Female", "Other"] as const).map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className={`h-12 rounded-xl border-2 text-sm font-medium transition-all ${
                      gender === g
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >{g}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {step !== "idle" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button
            onClick={handleSubmit} disabled={loading || !department || !phone}
            className="w-full h-12 rounded-xl text-base font-medium" size="lg"
          >
            {loading ? "Adding to queue..." : "Add to Queue"}
          </Button>
        </motion.div>
      )}
      {feeModal.open && <FeeCollectionModal />}
    </div>
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
        <Button
          onClick={nextPatient}
          disabled={!activeQueue.find(q => q.status === "in-consultation")}
          className="gap-2 rounded-xl" size="sm"
        >
          Next Patient
        </Button>
      </div>

      <div className="space-y-2">
        {activeQueue.map((entry, i) => {
          const patient = patients.find(p => p.id === entry.patientId);
          if (!patient) return null;
          const isCurrent = entry.status === "in-consultation";

          return (
            <motion.div
              key={entry.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                isCurrent ? "bg-primary/10 border-2 border-primary/30" : "bg-card border border-border"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {entry.queueNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground">
                  {displayAge(patient)} yrs · {patient.gender}
                </p>
              </div>
              {isCurrent && (
                <span className="text-xs font-medium bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
                  Now
                </span>
              )}
              <button
                onClick={() => handleRemove(entry.id, patient.name)}
                disabled={removing === entry.id}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                title="Remove from queue"
              >
                {removing === entry.id
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
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


// ─── Collect Fee Tab ──────────────────────────────────────────────────────────
const CollectFeeTab = () => {
  const [phone,          setPhone]          = useState("");
  const [patient,        setPatient]        = useState<any>(null);
  const [notFound,       setNotFound]       = useState(false);
  const [searching,      setSearching]      = useState(false);
  const [selectedTests,  setSelectedTests]  = useState<{name:string;fee:number}[]>([]);
  const [testSearch,     setTestSearch]     = useState("");
  const [customTest,     setCustomTest]     = useState("");
  const [customFee,      setCustomFee]      = useState("");
  const [payMethod,      setPayMethod]      = useState("cash");
  const [saving,         setSaving]         = useState(false);
  const [success,        setSuccess]        = useState("");

  const searchPatient = async () => {
    if (phone.trim().length < 7) return;
    setSearching(true); setPatient(null); setNotFound(false);
    const found = await apiLookupPhone(phone);
    if (found) { setPatient(found); }
    else { setNotFound(true); }
    setSearching(false);
  };

  const filtered = COMMON_TESTS.filter(t =>
    t.name.toLowerCase().includes(testSearch.toLowerCase()) &&
    !selectedTests.some(s => s.name === t.name)
  );
  const total = selectedTests.reduce((s, t) => s + t.fee, 0);

  const handleCollect = async () => {
    if (!patient) { alert("Please search for a patient first."); return; }
    if (selectedTests.length === 0) { alert("Please add at least one test."); return; }
    setSaving(true);
    try {
      await apiCreatePayment({
        patientId: patient.id || patient._id,
        amount:    total,
        type:      "test",
        method:    payMethod,
        notes:     selectedTests.map(t => `${t.name}: ₹${t.fee}`).join(" | "),
      });
      setSuccess(`₹${total} collected from ${patient.name}`);
      setPhone(""); setPatient(null); setSelectedTests([]); setTestSearch("");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) { alert(e.message || "Payment failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-foreground mb-1">Collect Test / Procedure Fee</h2>
      <p className="text-sm text-muted-foreground mb-6">For patients returning to pay for lab tests or scans</p>

      {success && (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
          className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{success}</p>
        </motion.div>
      )}

      {/* Patient search */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Patient Phone Number</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="tel" placeholder="Enter phone number..." value={phone}
              onChange={e => { setPhone(e.target.value); setPatient(null); setNotFound(false); }}
              onKeyDown={e => e.key === "Enter" && searchPatient()}
              className="pl-10 h-12 rounded-xl" />
          </div>
          <Button onClick={searchPatient} disabled={searching || phone.trim().length < 7} className="h-12 px-5 rounded-xl gap-2">
            {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {patient && (
          <motion.div key="found" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{patient.name}</p>
              <p className="text-xs text-muted-foreground">{patient.phone} · {patient.gender}</p>
            </div>
          </motion.div>
        )}
        {notFound && (
          <motion.div key="notfound" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="mb-6 flex flex-col items-center py-8 text-muted-foreground">
            <UserX className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium text-foreground">Patient not found</p>
            <p className="text-sm">No patient registered with that number</p>
          </motion.div>
        )}
      </AnimatePresence>

      {patient && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
          {/* Selected tests */}
          {selectedTests.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Selected Tests</label>
              {selectedTests.map((t,i) => (
                <div key={i} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-medium text-foreground">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <IndianRupee className="w-3 h-3 text-muted-foreground" />
                    <input type="number" min="0" value={t.fee}
                      onChange={e => setSelectedTests(prev => prev.map((x,j) => j===i ? {...x,fee:Number(e.target.value)} : x))}
                      className="w-20 h-7 text-sm text-right bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <button onClick={() => setSelectedTests(prev => prev.filter((_,j)=>j!==i))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-primary">₹{total}</span>
              </div>
            </div>
          )}

          {/* Search tests */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Add Tests</label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search tests (CBC, X-Ray, ECG...)" value={testSearch}
                onChange={e => setTestSearch(e.target.value)} className="pl-9 h-10 rounded-xl text-sm" />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filtered.map(t => (
                <button key={t.name} onClick={() => setSelectedTests(prev => [...prev, t])}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left">
                  <span className="text-sm text-foreground">{t.name}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <IndianRupee className="w-3 h-3" />{t.fee}
                    <Plus className="w-3.5 h-3.5 text-primary ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom test */}
          <div className="border-t border-border pt-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Add Custom Test</label>
            <div className="flex gap-2">
              <Input placeholder="Test name" value={customTest}
                onChange={e => setCustomTest(e.target.value)} className="h-10 rounded-xl text-sm flex-1" />
              <div className="relative w-28">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input type="number" placeholder="Fee" value={customFee}
                  onChange={e => setCustomFee(e.target.value)} className="h-10 rounded-xl text-sm pl-7" />
              </div>
              <button onClick={() => {
                if (!customTest.trim()) return;
                setSelectedTests(prev => [...prev, { name: customTest.trim(), fee: Number(customFee||0) }]);
                setCustomTest(""); setCustomFee("");
              }} className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Payment Method</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m.key} onClick={() => setPayMethod(m.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    payMethod===m.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}>
                  <m.icon className="w-3.5 h-3.5" />{m.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleCollect} disabled={saving||selectedTests.length===0}
            className="w-full h-12 rounded-xl text-base font-medium gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : `Collect ₹${total}`}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

// ─── Manage Tab ───────────────────────────────────────────────────────────────
const ManageTab = () => {
  const { findPatientByPhone, refreshPatients } = useClinic();

  const [searchPhone, setSearchPhone] = useState("");
  const [found, setFound]             = useState<Patient | null>(null);
  const [searched, setSearched]       = useState(false);
  const [name, setName]               = useState("");
  const [dob, setDob]                 = useState("");
  const [gender, setGender]           = useState<"Male" | "Female" | "Other" | "">("");
  const [phone, setPhone]             = useState("");
  const [saving, setSaving]           = useState(false);
  const [success, setSuccess]         = useState("");
  const [error, setError]             = useState("");

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
    } else {
      setFound(null);
    }
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
    if (!name.trim() || !dob || !gender || !phone.trim()) {
      setError("All fields are required."); return;
    }
    setSaving(true); setError(""); setSuccess("");
    try {
      await apiUpdatePatient(found.id, {
        name: name.trim(), dateOfBirth: dob,
        age: calculateAge(dob), gender, phone: phone.trim(),
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
      <p className="text-sm text-muted-foreground mb-8">
        Search by phone number to edit or reset patient details
      </p>

      {/* Search */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Search by Phone
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="tel" placeholder="Enter phone number..." value={searchPhone}
              onChange={e => { setSearchPhone(e.target.value); setSearched(false); setFound(null); }}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="pl-10 h-12 rounded-xl"
            />
          </div>
          <Button onClick={handleSearch} className="h-12 px-5 rounded-xl">Search</Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {searched && !found && (
          <motion.div
            key="notfound" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-10 text-muted-foreground"
          >
            <UserX className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">No patient found</p>
            <p className="text-sm">No patient registered with that number</p>
          </motion.div>
        )}

        {found && (
          <motion.div
            key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Full Name
              </label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Phone Number
              </label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" />
            </div>

            {/* DOB */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Date of Birth
              </label>
              <Input
                type="date" value={dob} min={minDate} max={maxDate}
                onChange={e => setDob(e.target.value)} className="h-12 rounded-xl"
              />
              {dob && calculateAge(dob) >= 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-primary font-medium mt-1.5">
                  Age: {calculateAge(dob)} year{calculateAge(dob) !== 1 ? "s" : ""} old
                </motion.p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Gender
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Male", "Female", "Other"] as const).map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className={`h-12 rounded-xl border-2 text-sm font-medium transition-all ${
                      gender === g
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >{g}</button>
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
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ReceptionDashboard = () => {
  const { queue } = useClinic();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("register");

  const [showChangePin, setShowChangePin] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
    navigate("/");
  };
  const activeQueue = queue.filter(q => q.status !== "done");

  const tabs = [
    { key: "register" as Tab, label: "Register",                      icon: UserCheck     },
    { key: "queue"    as Tab, label: `Queue (${activeQueue.length})`,  icon: ClipboardList },
    { key: "collect"  as Tab, label: "Collect Fee",                    icon: IndianRupee   },
    { key: "manage"   as Tab, label: "Manage",                         icon: RefreshCw     },
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1">{activeQueue.length} in queue</span>
          <Button variant="ghost" size="sm" onClick={() => setShowChangePin(true)}
            className="gap-1.5 text-muted-foreground hover:text-foreground">
            <KeyRound className="w-4 h-4" /> Change PIN
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="gap-1.5 text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-border bg-card px-6">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
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
          {activeTab === "manage" && (
            <motion.div key="collect" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CollectFeeTab />
            </motion.div>
          )}
          {activeTab === "manage" && (
            <motion.div key="manage" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ManageTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default ReceptionDashboard;