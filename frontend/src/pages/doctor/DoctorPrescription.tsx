import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, Search, Check, Pill,
  Send, Download, RefreshCw, MessageCircle,
  ChevronDown, ChevronUp, Clock, FileText,
  UserCheck, FlaskConical, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";
import { Medicine, PrescriptionMedicine } from "@/data/mockData";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

const apiCreatePrescriptionDirect = async (body: object) => {
  const res = await fetch(`${BASE_URL}/prescriptions`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to save prescription");
  return data;
};

const apiSendPrescription = async (prescriptionId: string) => {
  const res = await fetch(`${BASE_URL}/prescriptions/${prescriptionId}/send`, {
    method: "POST", headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to send");
  return data;
};

const apiDownloadPrescription = (prescriptionId: string) =>
  window.open(`${BASE_URL}/prescriptions/${prescriptionId}/pdf`, "_blank");

const apiDownloadLabForm = (prescriptionId: string) =>
  window.open(`${BASE_URL}/prescriptions/${prescriptionId}/lab-form`, "_blank");

// ─── Constants ────────────────────────────────────────────────────────────────
const DURATION_PRESETS = [1, 3, 5, 7, 10, 14, 21, 30];

const SPECIAL_INSTRUCTIONS = [
  "Before food", "After food", "With food", "Empty stomach",
  "Before sleep", "With warm water", "With milk",
  "Chew before swallowing", "Do not crush", "Apply externally",
];

const FREQUENCY_INTERVALS: { key: "4h" | "6h" | "8h" | "12h"; label: string }[] = [
  { key: "4h",  label: "Every 4 hrs"  },
  { key: "6h",  label: "Every 6 hrs"  },
  { key: "8h",  label: "Every 8 hrs"  },
  { key: "12h", label: "Every 12 hrs" },
];

type DoseSlot = "morning" | "afternoon" | "evening" | "night";

const MEDICINE_CATEGORIES = [
  { key: "Fever & Pain",  emoji: "🌡️" },
  { key: "Antibiotics",   emoji: "💊" },
  { key: "Allergy & Cold",emoji: "🤧" },
  { key: "Gastric",       emoji: "🫁" },
  { key: "Vitamins",      emoji: "💪" },
  { key: "Diabetes",      emoji: "🩸" },
  { key: "BP & Cardiac",  emoji: "❤️" },
  { key: "Injections",    emoji: "💉" },
  { key: "Dermatology",   emoji: "🧴" },
  { key: "ENT",           emoji: "👂" },
  { key: "Ophthalmology", emoji: "👁️" },
  { key: "Pulmonology",   emoji: "🫀" },
  { key: "Pediatric",     emoji: "👶" },
  { key: "Gynecology",    emoji: "🌸" },
  { key: "Psychiatry",    emoji: "🧠" },
];


const DOSE_SLOTS: DoseSlot[] = ["morning", "afternoon", "evening", "night"];

// ─── Specialist types for referral ────────────────────────────────────────────
const SPECIALISTS = [
  "Cardiologist", "Neurologist", "Orthopedic Surgeon", "Dermatologist",
  "ENT Specialist", "Ophthalmologist", "Gynecologist", "Pediatrician",
  "Psychiatrist", "Oncologist", "Urologist", "Nephrologist",
  "Gastroenterologist", "Pulmonologist", "Endocrinologist", "Rheumatologist",
  "Physiotherapist", "Dentist", "General Surgeon", "Diabetologist",
];

// ─── Lab tests grouped by category ───────────────────────────────────────────
const LAB_TESTS: { category: string; tests: string[] }[] = [
  {
    category: "Blood Tests",
    tests: [
      "Complete Blood Count (CBC)",
      "Blood Sugar Fasting",
      "Blood Sugar PP (Post Prandial)",
      "HbA1c (Glycated Haemoglobin)",
      "Lipid Profile",
      "Liver Function Test (LFT)",
      "Kidney Function Test (KFT/RFT)",
      "Thyroid Profile (T3, T4, TSH)",
      "Serum Electrolytes",
      "Serum Uric Acid",
      "ESR (Erythrocyte Sedimentation Rate)",
      "CRP (C-Reactive Protein)",
      "Vitamin D (25-OH)",
      "Vitamin B12",
      "Haemoglobin (Hb)",
      "Iron Studies (TIBC, Ferritin)",
      "Dengue NS1 Antigen",
      "Malaria Parasite Test",
      "Widal Test",
      "Blood Culture & Sensitivity",
    ],
  },
  {
    category: "Urine Tests",
    tests: [
      "Urine Routine & Microscopy",
      "Urine Culture & Sensitivity",
      "24-Hour Urine Protein",
      "Urine Pregnancy Test (UPT)",
    ],
  },
  {
    category: "Imaging",
    tests: [
      "X-Ray Chest (PA View)",
      "X-Ray (specify part)",
      "Ultrasound Abdomen & Pelvis",
      "Ultrasound (specify part)",
      "ECG (Electrocardiogram)",
      "Echo (Echocardiogram)",
      "CT Scan (specify part)",
      "MRI (specify part)",
      "Mammography",
      "Bone Density Scan (DEXA)",
    ],
  },
  {
    category: "Other",
    tests: [
      "Sputum Culture & Sensitivity",
      "Stool Routine & Microscopy",
      "Pap Smear",
      "Biopsy (specify part)",
      "Spirometry (PFT)",
      "Audiometry",
    ],
  },
];

// ─── Medicine Card ────────────────────────────────────────────────────────────
interface MedCardProps {
  med:      PrescriptionMedicine;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PrescriptionMedicine>) => void;
}

const MedicineCard = ({ med, onRemove, onUpdate }: MedCardProps) => {
  const [expanded, setExpanded] = useState(true);

  const toggleSlot = (slot: DoseSlot) =>
    onUpdate(med.medicineId, { [slot]: !med[slot as keyof typeof med], frequencyInterval: null });

  const setFreqInterval = (key: "4h" | "6h" | "8h" | "12h" | null) =>
    onUpdate(med.medicineId, {
      frequencyInterval: key,
      morning: false, afternoon: false, evening: false, night: false,
    });

  const toggleInstruction = (instr: string) => {
    const current = med.instructions || "";
    const list    = current ? current.split(", ") : [];
    const updated = list.includes(instr) ? list.filter(i => i !== instr) : [...list, instr];
    onUpdate(med.medicineId, { instructions: updated.join(", ") });
  };

  const activeInstructions = med.instructions ? med.instructions.split(", ").filter(Boolean) : [];
  const usingInterval      = !!med.frequencyInterval;

  const summaryParts = [
    med.dosageAmount && med.dosageUnit ? `${med.dosageAmount}${med.dosageUnit}` : null,
    usingInterval
      ? FREQUENCY_INTERVALS.find(f => f.key === med.frequencyInterval)?.label
      : [med.morning && "M", med.afternoon && "A", med.evening && "E", med.night && "N"]
          .filter(Boolean).join("-") || "No timing",
    `${med.durationDays}d`,
    activeInstructions.length ? activeInstructions[0] : null,
  ].filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Pill className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{med.name}</p>
          <p className="text-xs text-muted-foreground truncate">{summaryParts.join(" · ")}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onRemove(med.medicineId)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

              {/* Dosage */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Dosage</label>
                <div className="flex gap-2">
                  <Input type="number" min="0" placeholder="Amount e.g. 500"
                    value={med.dosageAmount || ""}
                    onChange={e => onUpdate(med.medicineId, { dosageAmount: Number(e.target.value) || undefined })}
                    className="h-10 rounded-xl text-sm flex-1" />
                  <div className="flex gap-1">
                    {(["mg", "ml"] as const).map(unit => (
                      <button key={unit} onClick={() => onUpdate(med.medicineId, { dosageUnit: unit })}
                        className={`px-4 h-10 rounded-xl text-sm font-medium border-2 transition-all ${
                          med.dosageUnit === unit
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>{unit}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Frequency</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {DOSE_SLOTS.map(slot => (
                    <button key={slot} onClick={() => toggleSlot(slot)} disabled={usingInterval}
                      className={`py-2 rounded-xl text-xs font-medium transition-all border-2 ${
                        !usingInterval && med[slot as keyof typeof med]
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      } ${usingInterval ? "opacity-40 cursor-not-allowed" : ""}`}>
                      {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or use interval</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {FREQUENCY_INTERVALS.map(f => (
                    <button key={f.key}
                      onClick={() => usingInterval && med.frequencyInterval === f.key ? setFreqInterval(null) : setFreqInterval(f.key)}
                      className={`py-2 rounded-xl text-xs font-medium transition-all border-2 flex items-center justify-center gap-1 ${
                        usingInterval && med.frequencyInterval === f.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}>
                      <Clock className="w-3 h-3" />{f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Duration</label>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {DURATION_PRESETS.map(d => (
                    <button key={d} onClick={() => onUpdate(med.medicineId, { durationDays: d })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-2 ${
                        med.durationDays === d
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}>{d} {d === 1 ? "day" : "days"}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" min="1" max="365" placeholder="Custom days"
                    value={DURATION_PRESETS.includes(med.durationDays) ? "" : med.durationDays || ""}
                    onChange={e => { const v = parseInt(e.target.value); if (v > 0) onUpdate(med.medicineId, { durationDays: v }); }}
                    className="h-9 rounded-xl text-sm flex-1" />
                  <span className="text-xs text-muted-foreground shrink-0">days</span>
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Special Instructions</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SPECIAL_INSTRUCTIONS.map(instr => {
                    const active = activeInstructions.includes(instr);
                    return (
                      <button key={instr} onClick={() => toggleInstruction(instr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-2 ${
                          active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>
                        {active && <Check className="w-3 h-3 inline mr-1" />}{instr}
                      </button>
                    );
                  })}
                </div>
                <Input placeholder="Custom instruction (optional)…"
                  value={activeInstructions.filter(i => !SPECIAL_INSTRUCTIONS.includes(i)).join("")}
                  onChange={e => {
                    const standard = activeInstructions.filter(i => SPECIAL_INSTRUCTIONS.includes(i));
                    const custom   = e.target.value.trim();
                    onUpdate(med.medicineId, { instructions: custom ? [...standard, custom].join(", ") : standard.join(", ") });
                  }}
                  className="h-9 rounded-xl text-sm" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DoctorPrescription = () => {
  const navigate = useNavigate();
  const { getCurrentPatient, refreshQueue, refreshMedicines, medicines: ctxMedicines } = useClinic();
  const current = getCurrentPatient();

  const [medicines,     setMedicines]     = useState<PrescriptionMedicine[]>([]);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [showSearch,    setShowSearch]    = useState(false);
  const [doctorNotes,   setDoctorNotes]   = useState("");

  // Referral state
  const [referralEnabled,    setReferralEnabled]    = useState(false);
  const [referralSpecialist, setReferralSpecialist] = useState("");
  const [customSpecialist,   setCustomSpecialist]   = useState("");
  const [referralNotes,      setReferralNotes]      = useState("");
  const [specialistSearch,   setSpecialistSearch]   = useState("");

  // Lab tests state
  const [labEnabled,     setLabEnabled]     = useState(false);

  // ── Inline diagnosis state (replaces DoctorDiagnosis page) ──
  const [selectedDiagnoses,    setSelectedDiagnoses]    = useState<string[]>([]);
  const [diagSearch,           setDiagSearch]           = useState("");

  // Pre-fill from sessionStorage if coming from diagnosis page
  useEffect(() => {
    const data = sessionStorage.getItem("currentDiagnosis");
    if (data) {
      const p = JSON.parse(data);
      if (p.diagnoses?.length) setSelectedDiagnoses(p.diagnoses);
    }
  }, []);
  const [selectedTests,  setSelectedTests]  = useState<string[]>([]);
  const [customTest,     setCustomTest]     = useState("");
  const [labNotes,       setLabNotes]       = useState("");
  const [labSearch,      setLabSearch]      = useState("");
  const [expandedCats,   setExpandedCats]   = useState<string[]>(["Blood Tests"]);
  const [selectedCat,    setSelectedCat]    = useState<string>("");

  // Save/send state
  const [savedRxId,    setSavedRxId]    = useState("");
  const [saved,        setSaved]        = useState(false);
  const [savedPatient, setSavedPatient] = useState<any>(null);
  const [saving,       setSaving]       = useState(false);
  const [savedQueueId, setSavedQueueId] = useState<string>("");
  const [sending,      setSending]      = useState(false);
  const [sendResult,   setSendResult]   = useState<{ success: boolean; message: string; pdfUrl?: string } | null>(null);

  // Feature 5: Follow-up date
  const [followUpDate,     setFollowUpDate]     = useState("");
  const [followUpOverride, setFollowUpOverride] = useState(false);

  // Feature 3: Completion actions
  const [actionPrint,    setActionPrint]    = useState(false);
  const [actionPharmacy, setActionPharmacy] = useState(false);
  const [actionFollowUp, setActionFollowUp] = useState(false);

  useEffect(() => { refreshMedicines(); }, []);

  // Feature 5: auto-suggest follow-up date from max medicine duration
  useEffect(() => {
    if (medicines.length === 0 || followUpOverride) return;
    const maxDays = Math.max(...medicines.map(m => m.durationDays || 5));
    const d = new Date();
    d.setDate(d.getDate() + maxDays + (maxDays <= 3 ? 2 : maxDays <= 7 ? 3 : 5));
    setFollowUpDate(d.toISOString().split("T")[0]);
  }, [medicines, followUpOverride]);

  const filteredMeds = useMemo(() => {
    let meds = ctxMedicines;
    if (selectedCat) meds = meds.filter((m: any) => m.category === selectedCat);
    if (searchQuery)  meds = meds.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return meds;
  }, [searchQuery, selectedCat, ctxMedicines]);

  const filteredSpecialists = SPECIALISTS.filter(s =>
    s.toLowerCase().includes(specialistSearch.toLowerCase())
  );

  const allLabTests = LAB_TESTS.flatMap(c => c.tests);
  const filteredLabTests = labSearch
    ? allLabTests.filter(t => t.toLowerCase().includes(labSearch.toLowerCase()))
    : null;

  const addMedicine = (med: Medicine) => {
    if (medicines.find(m => m.medicineId === med.id)) return;
    setMedicines(prev => [...prev, {
      medicineId: med.id, name: med.name,
      morning: true, afternoon: false, evening: true, night: false,
      frequencyInterval: null, dosageAmount: undefined, dosageUnit: undefined,
      durationDays: 5, instructions: "",
    }]);
    setShowSearch(false); setSearchQuery("");
  };

  const removeMedicine = (id: string) => setMedicines(prev => prev.filter(m => m.medicineId !== id));

  const updateMedicine = (id: string, patch: Partial<PrescriptionMedicine>) =>
    setMedicines(prev => prev.map(m => m.medicineId === id ? { ...m, ...patch } : m));

  const toggleTest = (test: string) =>
    setSelectedTests(prev => prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test]);

  const addCustomTest = () => {
    const t = customTest.trim();
    if (t && !selectedTests.includes(t)) { setSelectedTests(prev => [...prev, t]); setCustomTest(""); }
  };

  const toggleCat = (cat: string) =>
    setExpandedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const handleSave = async () => {
    if (!current || medicines.length === 0) return;
    setSaving(true);
    try {
      const parsed2        = JSON.parse(sessionStorage.getItem("currentDiagnosis") || "{}");
      const problems       = parsed2.problems       || [];
      const investigations = parsed2.investigations || [];
      const diagnoses      = selectedDiagnoses;
      const queueEntry     = current.queueEntry;
      setSavedQueueId(queueEntry?.id || "");

      const finalSpecialist = referralSpecialist || customSpecialist.trim();

      const res = await apiCreatePrescriptionDirect({
        patientId:      current.patient.id,
        complaints:     problems,
        problems,
        investigations,
        diagnoses,
        medicines:    medicines.map(m => ({
          medicineId:        m.medicineId,
          morning:           m.morning,
          afternoon:         m.afternoon,
          evening:           m.evening,
          night:             m.night,
          frequencyInterval: m.frequencyInterval || null,
          dosageAmount:      m.dosageAmount      || null,
          dosageUnit:        m.dosageUnit        || null,
          durationDays:      m.durationDays,
          instructions:      m.instructions      || "",
        })),
        notes:        doctorNotes || "",
        followUpDate: followUpDate || null,
        referral:     referralEnabled && finalSpecialist ? {
          specialist: finalSpecialist,
          notes:      referralNotes || "",
        } : null,
        labTests:     labEnabled && selectedTests.length > 0 ? {
          tests: selectedTests,
          notes: labNotes || "",
        } : null,
      });

      const rxId = String(res?.prescription?._id || res?.prescription?.id || res?._id || res?.id || "");
      setSavedPatient(current.patient);
      sessionStorage.removeItem("currentDiagnosis");
      setSavedRxId(rxId);
      setSaved(true);

      // Mark queue entry as done immediately on save
      const queueId = queueEntry?.id || "";
      setSavedQueueId(queueId);
      if (queueId) {
        await fetch(`${BASE_URL}/queue/${queueId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("cliniq_token")}` },
          body: JSON.stringify({ status: "done" }),
        });
      }
      await refreshQueue();
      setTimeout(() => refreshQueue(), 1500);
    } catch (err: any) {
      alert(err.message || "Failed to save prescription");
    } finally { setSaving(false); }
  };

  const handleSend = async () => {
    if (!savedRxId) { alert("No prescription ID found."); return; }
    setSending(true); setSendResult(null);
    try {
      const res = await apiSendPrescription(savedRxId);
      setSendResult({ success: true, message: res.message, pdfUrl: res.pdfUrl });
    } catch (err: any) {
      setSendResult({ success: false, message: err.message });
    } finally { setSending(false); }
  };

  const handleFinish = () => navigate("/doctor/dashboard");

  if (!current && !saved) { navigate("/doctor/dashboard"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/doctor/dashboard")} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-foreground">Prescription</h1>
          <p className="text-xs text-muted-foreground">
            {(savedPatient || current?.patient)?.name} · {(savedPatient || current?.patient)?.age} yrs
          </p>
        </div>
      </header>

      <AnimatePresence mode="wait">

        {/* ── Saved Screen ────────────────────────────────────────────────── */}
        {saved && (
          <motion.div key="saved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto p-8 space-y-6">

            <div className="flex flex-col items-center text-center py-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <Check className="w-8 h-8 text-emerald-500" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground">Prescription Saved!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Send it to <span className="font-medium text-foreground">{savedPatient?.name}</span> via WhatsApp
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{savedPatient?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {medicines.length} medicine{medicines.length !== 1 ? "s" : ""} prescribed
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Sending PDF to WhatsApp number:</p>
                <p className="font-semibold text-foreground text-lg tracking-wide">{savedPatient?.phone}</p>
              </div>
            </div>


            {/* ── Completion Actions (Feature 3) ── */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Actions</p>

              {/* Send via WhatsApp */}
              <div className="space-y-2">
                <Button onClick={handleSend} disabled={sending}
                  className="w-full h-12 rounded-xl text-base font-medium gap-2" size="lg">
                  {sending
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating & Sending...</>
                    : <><Send className="w-4 h-4" /> Send via WhatsApp</>}
                </Button>

                <AnimatePresence>
                  {sendResult && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl p-3 flex items-start gap-3 ${
                        sendResult.success
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                          : "bg-destructive/10 border border-destructive/20"
                      }`}>
                      {sendResult.success
                        ? <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        : <X     className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                      <p className={`text-sm font-medium ${sendResult.success ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>
                        {sendResult.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Print */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={actionPrint} onChange={e => {
                  setActionPrint(e.target.checked);
                  if (e.target.checked) apiDownloadPrescription(savedRxId);
                }} className="w-4 h-4 rounded accent-primary" />
                <Download className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Print / Download Prescription</span>
              </label>

              {/* Send to Pharmacy */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={actionPharmacy} onChange={async e => {
                  setActionPharmacy(e.target.checked);
                  if (e.target.checked && savedRxId) {
                    try {
                      await fetch(`${BASE_URL}/prescriptions/${savedRxId}/send-pharmacy`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${localStorage.getItem("cliniq_token")}` },
                      });
                    } catch {}
                  }
                }} className="w-4 h-4 rounded accent-primary" />
                <Printer className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Send to Pharmacy</span>
              </label>

              {/* Book Follow-up */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={actionFollowUp} onChange={e => setActionFollowUp(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary" />
                <span className="text-lg">📅</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Book Follow-up</span>
                  {followUpDate && <p className="text-xs text-muted-foreground">{new Date(followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
                </div>
              </label>

              {/* Lab form */}
              {labEnabled && selectedTests.length > 0 && (
                <Button variant="outline" onClick={() => apiDownloadLabForm(savedRxId)}
                  className="w-full h-11 rounded-xl gap-2 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/5">
                  <Printer className="w-4 h-4" /> Download Lab Form
                </Button>
              )}
            </div>

            <Button variant="ghost" onClick={handleFinish}
              className="w-full h-11 rounded-xl text-muted-foreground">
              Done — Back to Dashboard
            </Button>
          </motion.div>
        )}

        {/* ── Prescription Form ───────────────────────────────────────────── */}
        {!saved && (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto p-6 space-y-6">

            {/* ── Medicines ── */}
            <div className="space-y-3">
              <AnimatePresence>
                {medicines.map(med => (
                  <MedicineCard key={med.medicineId} med={med} onRemove={removeMedicine} onUpdate={updateMedicine} />
                ))}
              </AnimatePresence>
            </div>

            {/* Add medicine */}
            {showSearch ? (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search medicines…" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl" autoFocus />
                </div>
                {/* Category quick-filter */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <button onClick={() => setSelectedCat("")}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      !selectedCat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}>All</button>
                  {MEDICINE_CATEGORIES.map(cat => (
                    <button key={cat.key} onClick={() => setSelectedCat(cat.key === selectedCat ? "" : cat.key)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        selectedCat === cat.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}>
                      {cat.emoji} {cat.key}
                    </button>
                  ))}
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {filteredMeds.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No medicines found. Ask admin to add medicines.
                    </p>
                  )}
                  {filteredMeds.map(med => {
                    const added = medicines.find(m => m.medicineId === med.id);
                    return (
                      <button key={med.id} onClick={() => !added && addMedicine(med)} disabled={!!added}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${
                          added ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
                        }`}>
                        <span>
                          <span className="font-medium text-foreground">{med.name}</span>
                          <span className="text-xs text-muted-foreground ml-1.5">{med.type}</span>
                          {(med as any).category && (med as any).category !== "General" && (
                            <span className="text-xs text-primary/70 ml-1.5 font-medium">{(med as any).category}</span>
                          )}
                        </span>
                        {added && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                  className="mt-2 w-full">Cancel</Button>
              </motion.div>
            ) : (
              <Button variant="outline" onClick={() => setShowSearch(true)}
                className="w-full h-12 rounded-xl border-dashed gap-2">
                <Plus className="w-4 h-4" /> Add Medicine
              </Button>
            )}

            {/* ── Referral System ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Toggle header */}
              <button onClick={() => setReferralEnabled(!referralEnabled)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  referralEnabled ? "bg-violet-500/10" : "bg-muted"
                }`}>
                  <UserCheck className={`w-4 h-4 ${referralEnabled ? "text-violet-500" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground text-sm">Referral to Specialist</p>
                  <p className="text-xs text-muted-foreground">
                    {referralEnabled && (referralSpecialist || customSpecialist)
                      ? `Referring to ${referralSpecialist || customSpecialist}`
                      : "Refer this patient to another specialist"}
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                  referralEnabled ? "bg-violet-500" : "bg-muted-foreground/30"
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    referralEnabled ? "left-5" : "left-1"
                  }`} />
                </div>
              </button>

              <AnimatePresence>
                {referralEnabled && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

                      {/* Specialist search */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                          Select Specialist
                        </label>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="Search specialist…" value={specialistSearch}
                            onChange={e => setSpecialistSearch(e.target.value)}
                            className="pl-9 h-10 rounded-xl text-sm" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                          {filteredSpecialists.map(s => (
                            <button key={s} onClick={() => { setReferralSpecialist(s); setCustomSpecialist(""); }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-2 ${
                                referralSpecialist === s
                                  ? "border-violet-500 bg-violet-500/5 text-violet-600 dark:text-violet-400"
                                  : "border-border text-muted-foreground hover:border-violet-500/40"
                              }`}>{s}</button>
                          ))}
                        </div>
                      </div>

                      {/* Custom specialist */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Or Type Custom Specialist
                        </label>
                        <Input placeholder="e.g. Sports Medicine Specialist…"
                          value={customSpecialist}
                          onChange={e => { setCustomSpecialist(e.target.value); if (e.target.value) setReferralSpecialist(""); }}
                          className="h-10 rounded-xl text-sm" />
                      </div>

                      {/* Referral notes */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Referral Notes
                        </label>
                        <textarea
                          placeholder="Reason for referral, clinical summary, specific requests…"
                          value={referralNotes}
                          onChange={e => setReferralNotes(e.target.value)}
                          rows={3}
                          className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Lab / Investigation Generator ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Toggle header */}
              <button onClick={() => setLabEnabled(!labEnabled)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  labEnabled ? "bg-blue-500/10" : "bg-muted"
                }`}>
                  <FlaskConical className={`w-4 h-4 ${labEnabled ? "text-blue-500" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground text-sm">Lab / Investigation Tests</p>
                  <p className="text-xs text-muted-foreground">
                    {labEnabled && selectedTests.length > 0
                      ? `${selectedTests.length} test${selectedTests.length > 1 ? "s" : ""} selected — exports as separate form`
                      : "Generate a separate lab test requisition form"}
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                  labEnabled ? "bg-blue-500" : "bg-muted-foreground/30"
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    labEnabled ? "left-5" : "left-1"
                  }`} />
                </div>
              </button>

              <AnimatePresence>
                {labEnabled && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

                      {/* Selected tests */}
                      {selectedTests.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Selected ({selectedTests.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedTests.map(t => (
                              <span key={t}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                {t}
                                <button onClick={() => toggleTest(t)} className="ml-0.5 hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Search tests */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search tests…" value={labSearch}
                          onChange={e => setLabSearch(e.target.value)}
                          className="pl-9 h-10 rounded-xl text-sm" />
                      </div>

                      {/* Filtered results */}
                      {labSearch && filteredLabTests && (
                        <div className="flex flex-wrap gap-1.5">
                          {filteredLabTests.length === 0
                            ? <p className="text-xs text-muted-foreground italic">No tests found</p>
                            : filteredLabTests.map(t => (
                              <button key={t} onClick={() => toggleTest(t)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-2 ${
                                  selectedTests.includes(t)
                                    ? "border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400"
                                    : "border-border text-muted-foreground hover:border-blue-500/40"
                                }`}>
                                {selectedTests.includes(t) && <Check className="w-3 h-3 inline mr-1" />}
                                {t}
                              </button>
                            ))
                          }
                        </div>
                      )}

                      {/* Categorised tests */}
                      {!labSearch && (
                        <div className="space-y-2">
                          {LAB_TESTS.map(cat => (
                            <div key={cat.category} className="border border-border rounded-xl overflow-hidden">
                              <button onClick={() => toggleCat(cat.category)}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors">
                                <span className="text-xs font-semibold text-foreground">{cat.category}</span>
                                <div className="flex items-center gap-2">
                                  {cat.tests.some(t => selectedTests.includes(t)) && (
                                    <span className="text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                      {cat.tests.filter(t => selectedTests.includes(t)).length} selected
                                    </span>
                                  )}
                                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                                    expandedCats.includes(cat.category) ? "rotate-180" : ""
                                  }`} />
                                </div>
                              </button>
                              <AnimatePresence>
                                {expandedCats.includes(cat.category) && (
                                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }}
                                    exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                                      {cat.tests.map(t => (
                                        <button key={t} onClick={() => toggleTest(t)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-2 ${
                                            selectedTests.includes(t)
                                              ? "border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400"
                                              : "border-border text-muted-foreground hover:border-blue-500/40"
                                          }`}>
                                          {selectedTests.includes(t) && <Check className="w-3 h-3 inline mr-1" />}
                                          {t}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Custom test */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Add Custom Test
                        </label>
                        <div className="flex gap-2">
                          <Input placeholder="e.g. HIV Elisa, ANA Profile…"
                            value={customTest}
                            onChange={e => setCustomTest(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addCustomTest()}
                            className="h-10 rounded-xl text-sm flex-1" />
                          <Button size="icon" variant="outline" onClick={addCustomTest}
                            disabled={!customTest.trim()} className="h-10 w-10 rounded-xl shrink-0">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Lab notes */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                          Lab Notes / Special Instructions
                        </label>
                        <Input placeholder="e.g. Fasting required, collect early morning sample…"
                          value={labNotes}
                          onChange={e => setLabNotes(e.target.value)}
                          className="h-10 rounded-xl text-sm" />
                      </div>

                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                        <Printer className="w-4 h-4 text-blue-500 shrink-0" />
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          A separate lab investigation form PDF will be available to download after saving
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>


            {/* ── Diagnosis ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Diagnosis</p>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedDiagnoses.map(d => (
                    <span key={d} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {d}<button onClick={() => setSelectedDiagnoses(prev => prev.filter(x => x !== d))}><X className="w-3 h-3 ml-0.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {["Viral Fever","Upper Respiratory Tract Infection","Lower Respiratory Tract Infection","Gastritis","Hypertension","Type 2 Diabetes","Migraine","Viral Flu","Allergic Rhinitis","Food Poisoning","Typhoid","Tonsillitis","Acute Bronchitis","Acid Peptic Disease","Anemia","Urinary Tract Infection","Dengue Fever","Hypothyroidism","Sinusitis","Asthma"].map(d => (
                    <button key={d} onClick={() => setSelectedDiagnoses(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedDiagnoses.includes(d) ? "bg-emerald-500 text-white border-emerald-500" : "border-border text-muted-foreground hover:border-emerald-400/40"}`}>{d}</button>
                  ))}
                </div>
                <Input placeholder="Type custom diagnosis and press Enter..."
                  value={diagSearch} onChange={e => setDiagSearch(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter" && diagSearch.trim()) { setSelectedDiagnoses(prev => prev.includes(diagSearch.trim()) ? prev : [...prev, diagSearch.trim()]); setDiagSearch(""); }}}
                  className="h-9 rounded-xl text-sm" />
              </div>
            </div>

            {/* ── Doctor's Notes ── */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-primary" />
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Doctor's Notes
                </label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Advice, follow-up instructions, lifestyle changes — printed on the prescription PDF
              </p>
              <textarea
                placeholder="Write your notes, advice, or follow-up instructions here…"
                value={doctorNotes}
                onChange={e => setDoctorNotes(e.target.value)}
                rows={5}
                className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground leading-relaxed"
              />
            </div>

            {/* ── Follow-up Date (Feature 5) ── */}
            {medicines.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">📅</span>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow-up Date</label>
                </div>
                {followUpDate && !followUpOverride && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Suggested based on treatment duration
                  </p>
                )}
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => { setFollowUpDate(e.target.value); setFollowUpOverride(true); }}
                    className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                  {followUpOverride && (
                    <button onClick={() => setFollowUpOverride(false)}
                      className="text-xs text-primary hover:underline shrink-0">Reset</button>
                  )}
                  <button onClick={() => setFollowUpDate("")}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0">Clear</button>
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={medicines.length === 0 || saving}
              className="w-full h-12 rounded-xl text-base font-medium gap-2">
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Check className="w-4 h-4" /> Save Prescription ({medicines.length} medicine{medicines.length !== 1 ? "s" : ""})</>}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DoctorPrescription;