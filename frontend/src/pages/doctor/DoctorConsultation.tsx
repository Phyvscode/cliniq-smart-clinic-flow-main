import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Search, Check, Pill, RefreshCw, Send,
  ChevronDown, ChevronUp, Clock, UserCheck, FlaskConical,
  Activity, Printer, MessageCircle, FileText, Bell,
  ClipboardList, FlaskRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClinic } from "@/context/ClinicContext";
import { Medicine, PrescriptionMedicine } from "@/data/mockData";
import { apiUpdateQueueStatus } from "@/lib/api";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

const apiCreatePrescription = async (body: object) => {
  const res = await fetch(`${BASE_URL}/prescriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to save prescription");
  return data;
};
const apiSendPrescription = async (id: string) => {
  const res = await fetch(`${BASE_URL}/prescriptions/${id}/send`, {
    method: "POST", headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
};
const apiDownloadRx = (id: string) => window.open(`${BASE_URL}/prescriptions/${id}/pdf`, "_blank");

import { getDeptData } from "@/data/departmentData";
import { getDeptMedicineCategories, getAllowedCategories } from "@/data/medicineCategoriesByDepartment";

const DURATION_OPTIONS = ["1 Day","2 Days","3 Days","5 Days","1 Week","2 Weeks","1 Month"];
const PROCEDURES = ["IV Fluids","Nebulization","Oxygen Support","Injection","Dressing","Suturing","Wound Care"];
const SPECIALISTS = [
  "Cardiologist","Neurologist","Orthopedic Surgeon","Dermatologist","ENT Specialist",
  "Ophthalmologist","Gynecologist","Pediatrician","Psychiatrist","Oncologist",
  "Urologist","Nephrologist","Gastroenterologist","Pulmonologist","Endocrinologist","Physiotherapist",
];
const DURATION_PRESETS = [1, 3, 5, 7, 10, 14, 21, 30];
const SPECIAL_INSTRUCTIONS = ["Before food","After food","With food","Empty stomach","Before sleep","With warm water","With milk","Apply externally"];
const FREQ_INTERVALS: { key: "4h"|"6h"|"8h"|"12h"; label: string }[] = [
  { key: "4h", label: "4h" }, { key: "6h", label: "6h" }, { key: "8h", label: "8h" }, { key: "12h", label: "12h" },
];
type DoseSlot = "morning"|"afternoon"|"evening"|"night";
const DOSE_SLOTS: DoseSlot[] = ["morning","afternoon","evening","night"];

interface Vitals { bpSys?: number; bpDia?: number; pulse?: number; temp?: number; spo2?: number; rr?: number; height?: number; weight?: number; }

// ── Small components ──────────────────────────────────────────────────────────
const Chip = ({ label, selected, onClick, color = "dark" }: { label: string; selected: boolean; onClick: () => void; color?: "dark"|"blue"|"green"|"violet" }) => {
  const active = color === "blue" ? "bg-blue-600 text-white border-blue-600"
    : color === "green"  ? "bg-emerald-600 text-white border-emerald-600"
    : color === "violet" ? "bg-violet-600 text-white border-violet-600"
    : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white";
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${selected ? active : "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"}`}>
      {label}
    </button>
  );
};
const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">{children}</p>
);
const StepHeader = ({ num, icon: Icon, label }: { num: number; icon: typeof Activity; label: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      <span className="text-[10px] font-semibold tracking-widest">STEP {num}</span>
    </div>
    <h3 className="text-2xl font-serif text-gray-900 dark:text-white">{label}</h3>
  </div>
);

// ── Duration Modal ────────────────────────────────────────────────────────────
const DurationModal = ({ complaint, onSelect, onClose }: { complaint: string; onSelect: (d: string) => void; onClose: () => void }) => {
  const [custom, setCustom] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{complaint}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Since how long?</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {DURATION_OPTIONS.map(d => (
            <button key={d} onClick={() => { onSelect(d); onClose(); }}
              className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-gray-900 dark:hover:border-gray-300 transition-all">{d}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input placeholder="Custom e.g. 10 Days" value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && custom.trim()) { onSelect(custom.trim()); onClose(); } }}
            className="flex-1 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400" />
          <button onClick={() => { if (custom.trim()) { onSelect(custom.trim()); onClose(); } }} disabled={!custom.trim()}
            className="h-9 px-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold disabled:opacity-40">Add</button>
        </div>
        <button onClick={() => { onSelect(""); onClose(); }} className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Add without duration</button>
      </motion.div>
    </div>
  );
};
const SubAreaModal = ({ complaint, areas, onSelect, onClose }: { complaint: string; areas: string[]; onSelect: (l: string) => void; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{complaint}</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex flex-wrap gap-2">
        {areas.map(area => (
          <button key={area} onClick={() => { onSelect(`${complaint} - ${area}`); onClose(); }}
            className="px-3 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium hover:opacity-90">{area}</button>
        ))}
      </div>
      <button onClick={() => { onSelect(complaint); onClose(); }} className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Add "{complaint}" without specifying area</button>
    </motion.div>
  </div>
);

// ── Medicine Card ─────────────────────────────────────────────────────────────
const MedCard = ({ med, onRemove, onUpdate }: { med: PrescriptionMedicine; onRemove: (id: string) => void; onUpdate: (id: string, patch: Partial<PrescriptionMedicine>) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const usingInterval = !!med.frequencyInterval;
  const toggleSlot = (slot: DoseSlot) => onUpdate(med.medicineId, { [slot]: !med[slot as keyof typeof med], frequencyInterval: null });
  const setFreq = (key: "4h"|"6h"|"8h"|"12h"|null) => onUpdate(med.medicineId, { frequencyInterval: key, morning: false, afternoon: false, evening: false, night: false });
  const toggleInstr = (instr: string) => {
    const list = (med.instructions || "").split(", ").filter(Boolean);
    const updated = list.includes(instr) ? list.filter(i => i !== instr) : [...list, instr];
    onUpdate(med.medicineId, { instructions: updated.join(", ") });
  };
  const activeInstrs = (med.instructions || "").split(", ").filter(Boolean);
  const timingStr = usingInterval ? `Every ${med.frequencyInterval}`
    : [med.morning && "M", med.afternoon && "A", med.evening && "E", med.night && "N"].filter(Boolean).join("-") || "No timing";

  return (
    <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
          <Pill className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{med.name}</p>
          <p className="text-xs text-gray-400 truncate">{timingStr} · {med.durationDays}d</p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onRemove(med.medicineId)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2.5 border-t border-gray-200 dark:border-white/10 pt-3">
              <div className="flex gap-1.5">
                <input type="number" placeholder="Dose" value={med.dosageAmount || ""}
                  onChange={e => onUpdate(med.medicineId, { dosageAmount: Number(e.target.value) || undefined })}
                  className="w-20 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-400" />
                {(["mg","ml"] as const).map(u => (
                  <button key={u} onClick={() => onUpdate(med.medicineId, { dosageUnit: u })}
                    className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-all ${med.dosageUnit === u ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>{u}</button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {DOSE_SLOTS.map(slot => (
                  <button key={slot} onClick={() => toggleSlot(slot)} disabled={usingInterval}
                    className={`py-1.5 rounded-lg text-[10px] font-medium border transition-all ${!usingInterval && med[slot as keyof typeof med] ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-400"} ${usingInterval ? "opacity-30 cursor-not-allowed" : ""}`}>
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {FREQ_INTERVALS.map(f => (
                  <button key={f.key} onClick={() => (usingInterval && med.frequencyInterval === f.key) ? setFreq(null) : setFreq(f.key)}
                    className={`py-1.5 rounded-lg text-[10px] font-medium border flex items-center justify-center gap-0.5 transition-all ${usingInterval && med.frequencyInterval === f.key ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-400"}`}>
                    <Clock className="w-2.5 h-2.5" />{f.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {DURATION_PRESETS.map(d => (
                  <button key={d} onClick={() => onUpdate(med.medicineId, { durationDays: d })}
                    className={`h-7 px-2 rounded-lg text-[10px] font-medium border transition-all ${med.durationDays === d ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-400"}`}>{d}d</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {SPECIAL_INSTRUCTIONS.map(instr => (
                  <button key={instr} onClick={() => toggleInstr(instr)}
                    className={`h-6 px-2 rounded-full text-[10px] font-medium border transition-all ${activeInstrs.includes(instr) ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-400"}`}>
                    {activeInstrs.includes(instr) && <Check className="w-2.5 h-2.5 inline mr-0.5" />}{instr}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const DoctorConsultation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");
  const { patients, queue, medicines: ctxMedicines, getCurrentPatient, refreshQueue, refreshMedicines } = useClinic();

  const patient = patients.find(p => p.id === patientId)
    || (patients as any[]).find(p => p._patient?.id === patientId)?._patient;
  const current = getCurrentPatient();

  const doctorDept = useMemo(() => {
    const raw = localStorage.getItem("cliniq_user");
    const u = raw ? JSON.parse(raw) : null;
    return u?.specialization || u?.department || "General Medicine";
  }, []);
  const { complaints: COMPLAINTS_LIST, investigations: INVEST_ALL, diagnoses: DIAGNOSES_COMMON } = useMemo(
    () => getDeptData(doctorDept), [doctorDept]
  );
  const allowedMedCategories = useMemo(() => getAllowedCategories(doctorDept), [doctorDept]);
  const deptMedicineCategories = useMemo(() => getDeptMedicineCategories(doctorDept), [doctorDept]);

  const medSearchRef = useRef<HTMLInputElement>(null);
  const [globalSearch, setGlobalSearch] = useState("");

  // ── Complaints ────────────────────────────────────────────────────────────
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [pendingLabel,       setPendingLabel]        = useState<string | null>(null);
  const [subModal,           setSubModal]            = useState<string | null>(null);
  const [complaintSearch,    setComplaintSearch]     = useState("");

  // ── Investigations ────────────────────────────────────────────────────────
  const [selectedInvest, setSelectedInvest] = useState<string[]>([]);
  const [investSearch,   setInvestSearch]   = useState("");

  // ── Diagnosis ─────────────────────────────────────────────────────────────
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [diagSearch,        setDiagSearch]        = useState("");

  // ── Procedures ────────────────────────────────────────────────────────────
  const [selectedProcs, setSelectedProcs] = useState<string[]>([]);
  const [customProc,    setCustomProc]    = useState("");

  // ── Vitals ────────────────────────────────────────────────────────────────
  const [vitals, setVitals] = useState<Vitals>({});
  const updateVital = (k: keyof Vitals, v: number | undefined) => setVitals(prev => ({ ...prev, [k]: v }));
  const bmi = vitals.height && vitals.weight
    ? Number((vitals.weight / ((vitals.height / 100) ** 2)).toFixed(1)) : undefined;

  // ── Medicines ─────────────────────────────────────────────────────────────
  const [medicines,       setMedicines]       = useState<PrescriptionMedicine[]>([]);
  const [medSearch,       setMedSearch]       = useState("");
  const [selectedCat,     setSelectedCat]     = useState("");
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  // ── Referral ──────────────────────────────────────────────────────────────
  const [referralSpec,   setReferralSpec]   = useState("");
  const [referralCustom, setReferralCustom] = useState("");
  const [referralNotes,  setReferralNotes]  = useState("");
  const [showReferral,   setShowReferral]   = useState(false);

  // ── Notes & Follow-up ─────────────────────────────────────────────────────
  const [doctorNotes,      setDoctorNotes]      = useState("");
  const [followUpDate,     setFollowUpDate]     = useState("");
  const [followUpOverride, setFollowUpOverride] = useState(false);

  // ── Save state ────────────────────────────────────────────────────────────
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [savedRxId,     setSavedRxId]     = useState("");
  const [savedPatient,  setSavedPatient]  = useState<any>(null);
  const [savedQueueId,  setSavedQueueId]  = useState("");
  const [sending,       setSending]       = useState(false);
  const [sendResult,    setSendResult]    = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { refreshMedicines(); }, []);

  useEffect(() => {
    if (medicines.length === 0 || followUpOverride) return;
    const maxDays = Math.max(...medicines.map(m => m.durationDays || 5));
    const d = new Date();
    d.setDate(d.getDate() + maxDays + (maxDays <= 3 ? 2 : maxDays <= 7 ? 3 : 5));
    setFollowUpDate(d.toISOString().split("T")[0]);
  }, [medicines, followUpOverride]);

  // Doctors can only prescribe from their own department's medicine categories.
  const deptMeds = useMemo(
    () => ctxMedicines.filter((m: any) => allowedMedCategories.includes(m.category)),
    [ctxMedicines, allowedMedCategories]
  );

  const freqPrescribed = useMemo(() => deptMeds.slice(0, 6), [deptMeds]);

  const filteredMeds = useMemo(() => {
    let meds = deptMeds;
    if (selectedCat) meds = meds.filter((m: any) => m.category === selectedCat);
    const q = medSearch.trim().toLowerCase();
    if (q) {
      meds = meds.filter((m: any) =>
        m.name.toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q) ||
        (m.type || "").toLowerCase().includes(q)
      );
    }
    return meds;
  }, [medSearch, selectedCat, deptMeds]);

  const filteredComplaints = useMemo(() => {
    if (!complaintSearch) return COMPLAINTS_LIST;
    const q = complaintSearch.toLowerCase();
    return COMPLAINTS_LIST.filter(c => c.toLowerCase().includes(q));
  }, [complaintSearch]);

  const isComplaintSel = (c: string) => selectedComplaints.some(s => s === c || s.startsWith(`${c} -`));

  const addMedicine = (med: Medicine) => {
    if (medicines.find(m => m.medicineId === med.id)) return;
    setMedicines(prev => [...prev, {
      medicineId: med.id, name: med.name,
      morning: true, afternoon: false, evening: true, night: false,
      frequencyInterval: null, dosageAmount: undefined, dosageUnit: undefined,
      durationDays: 5, instructions: "",
    }]);
    setMedSearch(""); setSelectedCat(""); setShowMedDropdown(false);
  };

  const storedUser = localStorage.getItem("cliniq_user");
  const doctorName = storedUser ? JSON.parse(storedUser).name : "Doctor";
  const doctorSpec = storedUser ? (JSON.parse(storedUser).specialization || "General Medicine") : "General Medicine";

  const handleFinalize = async () => {
    if (!current && !patient) return;
    if (medicines.length === 0) { alert("Add at least one medicine to finalize."); return; }
    setSaving(true);
    try {
      const pat        = current?.patient || patient;
      const queueEntry = current?.queueEntry
        || queue.find(q => q.patientId === (pat?.id || patientId) && q.status !== "done");
      const finalSpec  = referralSpec || referralCustom.trim();
      const res = await apiCreatePrescription({
        patientId: pat?.id || patientId,
        complaints: selectedComplaints, problems: selectedComplaints,
        investigations: selectedInvest, diagnoses: selectedDiagnoses, treatments: selectedProcs,
        vitals: { ...vitals, bmi },
        medicines: medicines.map(m => ({
          medicineId: m.medicineId, morning: m.morning, afternoon: m.afternoon,
          evening: m.evening, night: m.night, frequencyInterval: m.frequencyInterval || null,
          dosageAmount: m.dosageAmount || null, dosageUnit: m.dosageUnit || null,
          durationDays: m.durationDays, instructions: m.instructions || "",
        })),
        notes: doctorNotes || "", followUpDate: followUpDate || null,
        referral: finalSpec ? { specialist: finalSpec, notes: referralNotes } : null,
      });
      const rxId = String(res?.prescription?._id || res?.prescription?.id || res?._id || res?.id || "");
      const queueId = queueEntry?.id || "";
      setSavedRxId(rxId); setSavedPatient(pat); setSavedQueueId(queueId); setSaved(true);
    } catch (err: any) {
      alert(err.message || "Failed to finalize prescription");
    } finally { setSaving(false); }
  };

  const pat         = current?.patient || patient;
  const queueEntry  = current?.queueEntry;
  const tokenNumber = queueEntry?.queueNumber || "—";
  const patPhone    = (pat as any)?.phone || "";

  if (!pat && !current) {
    return (
      <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f]">
        <DoctorSidebar active="consultation" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 dark:text-gray-600 text-sm mb-4">No active consultation.</p>
            <button onClick={() => navigate("/doctor/dashboard")}
              className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium">
              Go to Appointments
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SAVED SCREEN ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f]">
        <DoctorSidebar active="consultation" />
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full space-y-5">
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 mx-auto">
                <Check className="w-8 h-8 text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-1">Consultation complete</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Prescription saved for <span className="font-medium text-gray-900 dark:text-white">{savedPatient?.name}</span>
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-5 space-y-2.5">
              <SectionLabel>ACTIONS</SectionLabel>
              <Button onClick={async () => {
                setSending(true); setSendResult(null);
                try { const r = await apiSendPrescription(savedRxId); setSendResult({ success: true, message: r.message }); }
                catch (e: any) { setSendResult({ success: false, message: e.message }); }
                finally { setSending(false); }
              }} disabled={sending} className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 gap-2">
                {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send via WhatsApp</>}
              </Button>
              {sendResult && (
                <div className={`rounded-xl p-3 flex items-start gap-2 text-sm ${sendResult.success ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-600"}`}>
                  {sendResult.success ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <X className="w-4 h-4 mt-0.5 shrink-0" />}
                  {sendResult.message}
                </div>
              )}
              <Button variant="outline" onClick={() => apiDownloadRx(savedRxId)} className="w-full h-11 rounded-xl border-gray-200 dark:border-gray-700 gap-2">
                <Printer className="w-4 h-4" /> Print Prescription
              </Button>
              <Button variant="outline" onClick={async () => {
                try { await fetch(`${BASE_URL}/prescriptions/${savedRxId}/send-pharmacy`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }); } catch {}
              }} className="w-full h-11 rounded-xl border-gray-200 dark:border-gray-700 gap-2">
                <MessageCircle className="w-4 h-4" /> Send to Pharmacy
              </Button>
              <Button variant="outline" onClick={async () => {
                if (savedQueueId) {
                  try { await apiUpdateQueueStatus(savedQueueId, "done"); await refreshQueue(); } catch {}
                }
                navigate("/doctor/dashboard");
              }} className="w-full h-11 rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-2">
                <Check className="w-4 h-4" /> Finish
              </Button>
            </div>
            <Button variant="ghost" onClick={() => navigate("/doctor/dashboard")} className="w-full text-gray-500 dark:text-gray-400">
              Done — Back to Appointments
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── MAIN LAYOUT ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <DoctorSidebar active="consultation" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top search bar ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-200 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search patients, doctors, actions..."
              className="w-full h-9 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-10 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-gray-400 dark:focus:border-white/20 transition-colors" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 dark:text-gray-700 border border-gray-200 dark:border-gray-700 rounded px-1">⌘K</span>
          </div>
          <ThemeToggle />
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* ── Content area ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex min-w-0 overflow-hidden">

          {/* Left: scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-8 pt-7 pb-4">

              {/* Breadcrumb */}
              <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">
                OPD · DR. {doctorName.toUpperCase()} · {doctorSpec.toUpperCase()}
              </p>

              {/* Heading + action buttons */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-4xl font-serif text-gray-900 dark:text-white leading-tight">
                    Consultation in{" "}
                    <em className="text-gray-400 dark:text-gray-500 italic font-serif">progress</em>
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                    Click to select — common items first. Type only when needed.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  <button className="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 flex items-center gap-1.5 transition-colors">
                    <FlaskRound className="w-3.5 h-3.5" /> Send to Lab
                  </button>
                  <button className="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 flex items-center gap-1.5 transition-colors">
                    <ClipboardList className="w-3.5 h-3.5" /> Save draft
                  </button>
                  <button onClick={handleFinalize} disabled={saving || medicines.length === 0}
                    className="h-9 px-5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold flex items-center gap-1.5 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Finalizing…</> : <><Check className="w-3.5 h-3.5" /> Finalize</>}
                  </button>
                </div>
              </div>

              {/* Patient card */}
              <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 flex items-center gap-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-gray-600 dark:text-white/70">{pat?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {pat?.name} · {pat?.age} · {(pat as any)?.gender?.charAt(0).toUpperCase() || "?"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Token #{tokenNumber}{patPhone ? ` · ${patPhone}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium shrink-0">
                  <Clock className="w-3 h-3" /> In room
                </span>
              </div>

              {/* Vitals — always visible horizontal row */}
              <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 mb-7">
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>VITALS</SectionLabel>
                  <span className="text-[9px] text-gray-400 dark:text-gray-600 font-medium tracking-wide">All fields default to none — enter only what was measured</span>
                </div>
                <div className="grid grid-cols-9 gap-2">
                  {[
                    { label: "BP SYS",  k: "bpSys"  as keyof Vitals },
                    { label: "BP DIA",  k: "bpDia"  as keyof Vitals },
                    { label: "PULSE",   k: "pulse"  as keyof Vitals },
                    { label: "TEMP °F", k: "temp"   as keyof Vitals },
                    { label: "SPO₂ %",  k: "spo2"   as keyof Vitals },
                    { label: "RESP",    k: "rr"     as keyof Vitals },
                    { label: "HT CM",   k: "height" as keyof Vitals },
                    { label: "WT KG",   k: "weight" as keyof Vitals },
                  ].map(f => {
                    const isSet = vitals[f.k] != null;
                    return (
                      <div key={f.k}>
                        <p className={`text-[9px] font-semibold tracking-wider mb-1.5 ${isSet ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}`}>{f.label}</p>
                        <input type="number" placeholder="—" value={vitals[f.k] ?? ""}
                          onChange={e => updateVital(f.k, e.target.value ? Number(e.target.value) : undefined)}
                          className={`w-full h-9 rounded-lg border px-2 text-sm focus:outline-none focus:border-gray-400 text-center transition-all ${
                            isSet
                              ? "border-gray-400 dark:border-gray-500 bg-white dark:bg-white/10 text-gray-900 dark:text-white font-medium"
                              : "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-600"
                          }`} />
                      </div>
                    );
                  })}
                  <div>
                    <p className={`text-[9px] font-semibold tracking-wider mb-1.5 ${bmi ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}`}>BMI</p>
                    <div className={`w-full h-9 rounded-lg border px-2 text-sm flex items-center justify-center ${bmi ? "border-gray-400 dark:border-gray-500 bg-white dark:bg-white/10 text-gray-900 dark:text-white font-medium" : "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-600"}`}>
                      {bmi || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="px-8 space-y-8 pb-16">

              {/* STEP 1: Complaints */}
              <section>
                <StepHeader num={1} icon={ClipboardList} label="Complaints" />
                {selectedComplaints.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-600 mb-3">Nothing selected yet</p>
                )}
                {selectedComplaints.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedComplaints.map(c => (
                      <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium">
                        {c}<button onClick={() => setSelectedComplaints(prev => prev.filter(x => x !== c))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input placeholder="Search or add a complaint..."
                      value={complaintSearch} onChange={e => setComplaintSearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && complaintSearch.trim()) {
                          if (!isComplaintSel(complaintSearch.trim())) setPendingLabel(complaintSearch.trim());
                          setComplaintSearch("");
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 pl-9 pr-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filteredComplaints.map(c => {
                      return (
                        <Chip key={c} label={c} selected={isComplaintSel(c)}
                          onClick={() => {
                            if (isComplaintSel(c)) {
                              setSelectedComplaints(prev => prev.filter(x => x !== c && !x.startsWith(`${c} -`)));
                            } else {
                              setPendingLabel(c);
                            }
                          }} />
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* STEP 2: Investigations */}
              <section>
                <StepHeader num={2} icon={FlaskConical} label="Investigations" />
                {selectedInvest.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedInvest.map(t => (
                      <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-medium">
                        {t}<button onClick={() => setSelectedInvest(prev => prev.filter(x => x !== t))}><X className="w-3 h-3 ml-0.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
                  <div className="relative mb-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input placeholder="Add additional investigation…" value={investSearch} onChange={e => setInvestSearch(e.target.value)}
                      className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 pl-9 pr-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {INVEST_ALL.filter(t => !investSearch || t.toLowerCase().includes(investSearch.toLowerCase())).map(t => (
                      <Chip key={t} label={t} selected={selectedInvest.includes(t)}
                        onClick={() => setSelectedInvest(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} color="blue" />
                    ))}
                  </div>
                </div>
              </section>

              {/* STEP 3: Diagnosis */}
              <section>
                <StepHeader num={3} icon={FileText} label="Diagnosis" />
                {selectedDiagnoses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedDiagnoses.map(d => (
                      <span key={d} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium">
                        {d}<button onClick={() => setSelectedDiagnoses(prev => prev.filter(x => x !== d))}><X className="w-3 h-3 ml-0.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
                {selectedDiagnoses.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-600 mb-3">Nothing selected yet</p>
                )}
                <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input placeholder="Search or add a diagnosis…" value={diagSearch} onChange={e => setDiagSearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && diagSearch.trim()) {
                          setSelectedDiagnoses(prev => prev.includes(diagSearch.trim()) ? prev : [...prev, diagSearch.trim()]);
                          setDiagSearch("");
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 pl-9 pr-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DIAGNOSES_COMMON.filter(d => !diagSearch || d.toLowerCase().includes(diagSearch.toLowerCase())).map(d => (
                      <Chip key={d} label={d} selected={selectedDiagnoses.includes(d)}
                        onClick={() => setSelectedDiagnoses(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} color="green" />
                    ))}
                  </div>
                </div>
              </section>

              {/* STEP 4: Medicines & Treatment */}
              <section>
                <StepHeader num={4} icon={Pill} label="Medicines & Treatment" />
                <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-5 space-y-5">
                  <div>
                    <SectionLabel>TREATMENT / PROCEDURE</SectionLabel>
                    <div className="flex flex-wrap gap-2 items-center">
                      {PROCEDURES.map(p => (
                        <Chip key={p} label={p} selected={selectedProcs.includes(p)}
                          onClick={() => setSelectedProcs(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} />
                      ))}
                      <input placeholder="Add custom…" value={customProc} onChange={e => setCustomProc(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && customProc.trim()) { setSelectedProcs(prev => [...prev, customProc.trim()]); setCustomProc(""); } }}
                        className="h-8 px-3 rounded-full border border-dashed border-gray-300 dark:border-gray-700 bg-transparent text-xs text-gray-600 dark:text-gray-400 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-gray-400 w-28" />
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-600">
                    Showing {doctorDept} medicines only
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input ref={medSearchRef} placeholder="Search medicines by name or type..."
                      value={medSearch} onChange={e => { setMedSearch(e.target.value); setShowMedDropdown(true); }}
                      onFocus={() => setShowMedDropdown(true)}
                      className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 pl-9 pr-12 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white dark:focus:bg-white/10 transition-colors" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 dark:text-gray-700 font-medium border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">⌘K</span>
                  </div>
                  <AnimatePresence>
                    {showMedDropdown && (medSearch || selectedCat) && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                        {filteredMeds.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">No medicines found. Ask admin to add.</p>
                        ) : filteredMeds.map((med: any) => {
                          const added = medicines.find(m => m.medicineId === med.id);
                          return (
                            <button key={med.id} onClick={() => !added && addMedicine(med)} disabled={!!added}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors ${added ? "opacity-40 cursor-not-allowed" : "hover:bg-white dark:hover:bg-white/10"}`}>
                              <span>
                                <span className="font-medium text-gray-900 dark:text-white">{med.name}</span>
                                {med.type && <span className="text-gray-400 ml-1.5 text-xs">· {med.type}</span>}
                              </span>
                              {added && <Check className="w-3.5 h-3.5 text-gray-400" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!medSearch && (
                    <>
                      <div>
                        <SectionLabel>• {doctorDept.toUpperCase()} CATEGORIES</SectionLabel>
                        <div className="grid grid-cols-5 gap-2">
                          {deptMedicineCategories.map(cat => (
                            <button key={cat.key}
                              onClick={() => { setSelectedCat(selectedCat === cat.key ? "" : cat.key); setShowMedDropdown(true); }}
                              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${selectedCat === cat.key ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-white/10" : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"}`}>
                              <span className="text-xl leading-none">{cat.emoji}</span>
                              <span className="text-[9px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">{cat.key}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {freqPrescribed.length > 0 && (
                        <div>
                          <SectionLabel>• ✨ FREQUENTLY PRESCRIBED</SectionLabel>
                          <div className="flex flex-wrap gap-2">
                            {freqPrescribed.map((med: any) => {
                              const added = medicines.find(m => m.medicineId === med.id);
                              return (
                                <button key={med.id} onClick={() => !added && addMedicine(med)} disabled={!!added}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-left transition-all ${added ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-white/10 opacity-60 cursor-not-allowed" : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{med.name}</span>
                                  {med.type && <span className="text-xs text-gray-400">· {med.type}</span>}
                                  {added && <Check className="w-3 h-3 text-gray-400 ml-0.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

            </div>
          </div>

          {/* ── Right: prescription panel ──────────────────────────────────── */}
          <div className="w-[320px] shrink-0 flex flex-col h-full border-l border-gray-200 dark:border-white/5 bg-white dark:bg-[#0d0d1a] overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              <div>
                <SectionLabel>PRESCRIPTION</SectionLabel>
                <p className="text-3xl font-serif text-gray-900 dark:text-white mb-4">
                  Rx · {medicines.length} item{medicines.length !== 1 ? "s" : ""}
                </p>
                {medicines.length === 0 ? (
                  <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-8 text-center">
                    <p className="text-sm text-gray-400 dark:text-gray-600">Search or tap a medicine to start.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {medicines.map(med => (
                        <MedCard key={med.medicineId} med={med}
                          onRemove={id => setMedicines(prev => prev.filter(m => m.medicineId !== id))}
                          onUpdate={(id, patch) => setMedicines(prev => prev.map(m => m.medicineId === id ? { ...m, ...patch } : m))} />
                      ))}
                    </AnimatePresence>
                    <button onClick={() => { medSearchRef.current?.focus(); medSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                      className="w-full h-8 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-all flex items-center justify-center gap-1">
                      <Plus className="w-3 h-3" /> Add another medicine
                    </button>
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/5" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>REFER / SEND TO</SectionLabel>
                  <span className="text-[10px] text-gray-400 -mt-3">Moves to that queue</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALISTS.slice(0, 6).map(s => (
                    <button key={s} onClick={() => setReferralSpec(s === referralSpec ? "" : s)}
                      className={`px-2.5 py-1.5 rounded-full text-[10px] font-medium border transition-all ${referralSpec === s ? "bg-violet-600 text-white border-violet-600" : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-400"}`}>
                      {s}
                    </button>
                  ))}
                  <button onClick={() => setShowReferral(!showReferral)}
                    className="px-2.5 py-1.5 rounded-full text-[10px] font-medium border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-gray-400">
                    More…
                  </button>
                </div>
                <AnimatePresence>
                  {showReferral && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {SPECIALISTS.slice(6).map(s => (
                          <button key={s} onClick={() => setReferralSpec(s === referralSpec ? "" : s)}
                            className={`px-2.5 py-1.5 rounded-full text-[10px] font-medium border transition-all ${referralSpec === s ? "bg-violet-600 text-white border-violet-600" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <input placeholder="Or type custom specialist…" value={referralCustom}
                        onChange={e => { setReferralCustom(e.target.value); if (e.target.value) setReferralSpec(""); }}
                        className="w-full h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400" />
                      <textarea placeholder="Referral notes…" value={referralNotes} onChange={e => setReferralNotes(e.target.value)} rows={2}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/5" />

              <div>
                <SectionLabel>CLINICAL NOTES</SectionLabel>
                <textarea placeholder="Observations, follow-up advice…" value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} rows={3}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-400" />
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/5" />

              <div>
                <SectionLabel>FOLLOW-UP DATE</SectionLabel>
                <input type="date" value={followUpDate}
                  onChange={e => { setFollowUpDate(e.target.value); setFollowUpOverride(true); }}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-400" />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-white/5 shrink-0">
              <button onClick={handleFinalize} disabled={saving || medicines.length === 0}
                className="w-full h-12 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {saving
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Finalizing…</>
                  : <><UserCheck className="w-4 h-4" /> Finalize &amp; Send to Pharmacy</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMedDropdown && (medSearch || selectedCat) && (
        <div className="fixed inset-0 z-0" onClick={() => setShowMedDropdown(false)} />
      )}

      <AnimatePresence>
        {subModal && (
          <SubAreaModal complaint={subModal} areas={[]}
            onSelect={label => { setSubModal(null); setPendingLabel(label); }}
            onClose={() => setSubModal(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pendingLabel && (
          <DurationModal complaint={pendingLabel}
            onSelect={duration => {
              const full = duration ? `${pendingLabel} – ${duration}` : pendingLabel;
              setSelectedComplaints(prev => [...prev, full]);
              setPendingLabel(null);
            }}
            onClose={() => setPendingLabel(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorConsultation;
