import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Search, X, ArrowRight, Plus, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

// ── Constants ──────────────────────────────────────────────────────────────
const COMPLAINTS_SIMPLE = [
  "Fever", "Cold", "Cough", "Headache", "Vomiting", "Loose Motions",
  "Weakness", "Chest Pain", "Breathlessness", "Allergy", "Sore Throat",
  "Acidity", "Nausea", "Dizziness", "Fatigue", "Constipation",
  "Eye Redness", "Skin Rash", "Itching", "Swelling", "Burning Urination",
];

const BODY_AREAS = ["Head", "Chest", "Abdomen", "Back", "Leg", "Knee", "Shoulder", "Neck", "Joint"];
const PAIN_AREAS = [...BODY_AREAS, "Ear", "Tooth", "Eye", "Throat"];

const COMPLAINTS_WITH_SUB: Record<string, string[]> = {
  "Body Ache": BODY_AREAS,
  "Pain":      PAIN_AREAS,
};

const INVESTIGATIONS = [
  "CBC", "LFT", "KFT", "Lipid Profile", "Blood Sugar (Fasting)",
  "Blood Sugar (PP)", "HbA1c", "Urine Routine", "X-Ray Chest", "X-Ray",
  "CT Scan", "MRI", "ECG", "Echo", "Thyroid Profile", "Dengue Test",
  "Malaria Test", "Typhoid (Widal)", "USG Abdomen", "CRP", "ESR",
  "Vitamin D", "Vitamin B12", "Serum Electrolytes", "Urine Culture",
];

const DURATION_OPTIONS = ["1 Day", "2 Days", "3 Days", "5 Days", "1 Week", "2 Weeks", "1 Month"];

// ── Interfaces ─────────────────────────────────────────────────────────────
interface Vitals {
  bpSys?: number; bpDia?: number; pulse?: number;
  temp?: number;  spo2?: number;  rr?: number;
  height?: number; weight?: number;
}

// ── Duration Modal ─────────────────────────────────────────────────────────
const DurationModal = ({
  complaint, onSelect, onClose,
}: { complaint: string; onSelect: (d: string) => void; onClose: () => void }) => {
  const [custom, setCustom] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-foreground">{complaint}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Since how long?</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {DURATION_OPTIONS.map(d => (
            <button key={d} onClick={() => { onSelect(d); onClose(); }}
              className="px-3 py-1.5 rounded-full border border-border text-sm font-medium hover:border-primary hover:bg-primary/5 transition-all">
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Custom e.g. 10 Days" value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && custom.trim()) { onSelect(custom.trim()); onClose(); } }}
            className="flex-1 h-9 rounded-xl text-sm" />
          <Button size="sm" disabled={!custom.trim()}
            onClick={() => { if (custom.trim()) { onSelect(custom.trim()); onClose(); } }}
            className="h-9 rounded-xl px-3">Add</Button>
        </div>
        <button onClick={() => { onSelect(""); onClose(); }}
          className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          Add without duration
        </button>
      </motion.div>
    </div>
  );
};

// ── Sub-area Modal ─────────────────────────────────────────────────────────
const SubAreaModal = ({
  complaint, areas, onSelect, onClose,
}: { complaint: string; areas: string[]; onSelect: (label: string) => void; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-foreground text-lg">{complaint}</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Select area</p>
      <div className="flex flex-wrap gap-2">
        {areas.map(area => (
          <button key={area} onClick={() => { onSelect(`${complaint} - ${area}`); onClose(); }}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            {area}
          </button>
        ))}
      </div>
      <button onClick={() => { onSelect(complaint); onClose(); }}
        className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
        Add "{complaint}" without specifying area
      </button>
    </motion.div>
  </div>
);

// ── Vitals Section ─────────────────────────────────────────────────────────
const VitalsSection = ({ vitals, onChange }: { vitals: Vitals; onChange: (key: keyof Vitals, val: number | undefined) => void }) => {
  const bmi = vitals.height && vitals.weight
    ? (vitals.weight / ((vitals.height / 100) ** 2)).toFixed(1)
    : "";

  const bmiLabel = !bmi ? "" :
    Number(bmi) < 18.5 ? "Underweight" :
    Number(bmi) < 25   ? "Normal"      :
    Number(bmi) < 30   ? "Overweight"  : "Obese";

  const bmiColor = !bmi ? "" :
    Number(bmi) < 18.5 ? "text-blue-500" :
    Number(bmi) < 25   ? "text-emerald-500" :
    Number(bmi) < 30   ? "text-amber-500"   : "text-red-500";

  const Field = ({ label, k, unit }: { label: string; k: keyof Vitals; unit?: string }) => {
    const isSet = vitals[k] != null;
    return (
      <div className="flex-1 min-w-[110px]">
        <label className={`text-xs mb-1 block font-medium ${isSet ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}`}>{label}</label>
        <div className="relative">
          <input type="number" placeholder="—"
            value={vitals[k] ?? ""}
            onChange={e => onChange(k, e.target.value ? Number(e.target.value) : undefined)}
            className={`w-full h-10 rounded-xl border px-3 text-sm focus:outline-none transition-all ${
              isSet
                ? "border-gray-400 dark:border-gray-500 bg-white dark:bg-white/10 text-gray-900 dark:text-white font-medium"
                : "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-400"
            } ${unit ? "pr-9" : ""}`} />
          {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{unit}</span>}
        </div>
      </div>
    );
  };

  const bpSet = vitals.bpSys != null || vitals.bpDia != null;

  return (
    <div className="bg-white dark:bg-[#0d0d1a] border border-gray-100 dark:border-white/8 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-gray-400 dark:text-gray-600" />
        <p className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Vitals</p>
        <span className="text-xs text-gray-400 dark:text-gray-600 ml-auto">All default to none</span>
      </div>
      <div className="space-y-3">
        {/* BP + Pulse + Temp */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className={`text-xs mb-1 block font-medium ${bpSet ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}`}>Blood Pressure</label>
            <div className="flex gap-1 items-center">
              <input type="number" placeholder="—" value={vitals.bpSys ?? ""}
                onChange={e => onChange("bpSys", e.target.value ? Number(e.target.value) : undefined)}
                className={`w-full h-10 rounded-xl border px-3 text-sm focus:outline-none transition-all ${
                  vitals.bpSys != null ? "border-gray-400 dark:border-gray-500 bg-white dark:bg-white/10 text-gray-900 dark:text-white font-medium" : "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-400"
                }`} />
              <span className="text-gray-400 text-sm shrink-0">/</span>
              <input type="number" placeholder="—" value={vitals.bpDia ?? ""}
                onChange={e => onChange("bpDia", e.target.value ? Number(e.target.value) : undefined)}
                className={`w-full h-10 rounded-xl border px-3 text-sm focus:outline-none transition-all ${
                  vitals.bpDia != null ? "border-gray-400 dark:border-gray-500 bg-white dark:bg-white/10 text-gray-900 dark:text-white font-medium" : "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-400"
                }`} />
              <span className="text-xs text-gray-400 shrink-0">mmHg</span>
            </div>
          </div>
          <Field label="Pulse" k="pulse" unit="bpm" />
          <Field label="Temperature" k="temp" unit="°F" />
        </div>
        {/* SpO2 + RR */}
        <div className="flex flex-wrap gap-3">
          <Field label="SpO2" k="spo2" unit="%" />
          <Field label="Resp. Rate" k="rr" unit="/min" />
        </div>
        {/* Height + Weight + BMI */}
        <div className="flex flex-wrap gap-3">
          <Field label="Height" k="height" unit="cm" />
          <Field label="Weight" k="weight" unit="kg" />
          <div className="flex-1 min-w-[110px]">
            <label className={`text-xs mb-1 block font-medium ${bmi ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}`}>BMI (auto)</label>
            <div className={`h-10 rounded-xl border px-3 flex items-center gap-2 ${bmi ? "border-gray-400 dark:border-gray-500 bg-white dark:bg-white/10" : "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5"}`}>
              <span className={`text-sm font-semibold ${bmi ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                {bmi || "—"}
              </span>
              {bmiLabel && <span className={`text-xs font-medium ${bmiColor}`}>{bmiLabel}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Chip ───────────────────────────────────────────────────────────────────
const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
  <motion.button whileTap={{ scale: 0.95 }} onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
      selected
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-foreground border-border hover:border-primary hover:bg-primary/5"
    }`}>
    {label}
  </motion.button>
);

const SectionHeader = ({ num, label }: { num: number; label: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
      {num}
    </span>
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const DoctorDiagnosis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");
  const { patients, refreshQueue, refreshPatients } = useClinic();
  const patient = patients.find(p => p.id === patientId)
    || (patients as any[]).find(p => p._patient?.id === patientId)?._patient;

  // ── Vitals ──
  const [vitals, setVitals] = useState<Vitals>({});
  const updateVital = (k: keyof Vitals, v: number | undefined) => setVitals(prev => ({ ...prev, [k]: v }));

  // ── Complaints with duration ──
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [pendingLabel, setPendingLabel]             = useState<string | null>(null);
  const [subModal, setSubModal]                     = useState<string | null>(null);
  const [customComplaint, setCustomComplaint]       = useState("");
  const [addingCustom, setAddingCustom]             = useState<string | null>(null); // for smart-db prompt

  // ── Investigations ──
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [testSearch, setTestSearch]       = useState("");
  const [customTest, setCustomTest]       = useState("");

  const handleComplaintClick = (complaint: string) => {
    const areas = COMPLAINTS_WITH_SUB[complaint];
    const isSelected = selectedComplaints.some(
      c => c === complaint || c.startsWith(`${complaint} – `) || c.startsWith(`${complaint} - `)
    );
    if (isSelected) {
      setSelectedComplaints(prev => prev.filter(
        c => c !== complaint && !c.startsWith(`${complaint} – `) && !c.startsWith(`${complaint} - `)
      ));
    } else if (areas) {
      setSubModal(complaint);
    } else {
      setPendingLabel(complaint);
    }
  };

  const handleSubSelect = (label: string) => {
    setSubModal(null);
    setPendingLabel(label);
  };

  const handleDurationSelect = (duration: string) => {
    if (!pendingLabel) return;
    const full = duration ? `${pendingLabel} – ${duration}` : pendingLabel;
    setSelectedComplaints(prev => [...prev, full]);
    setPendingLabel(null);
  };

  const isComplaintSelected = (c: string) =>
    selectedComplaints.some(s => s === c || s.startsWith(`${c} – `) || s.startsWith(`${c} - `));

  const addCustomComplaint = () => {
    const val = customComplaint.trim();
    if (!val || selectedComplaints.some(c => c === val || c.startsWith(`${val} – `))) return;
    if (!COMPLAINTS_SIMPLE.includes(val) && !Object.keys(COMPLAINTS_WITH_SUB).includes(val)) {
      setAddingCustom(val); // trigger smart-db prompt
    }
    setPendingLabel(val);
    setCustomComplaint("");
  };

  const toggleTest = (t: string) =>
    setSelectedTests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const addCustomTestFn = () => {
    const val = customTest.trim();
    if (!val || selectedTests.includes(val)) return;
    setSelectedTests(prev => [...prev, val]);
    setCustomTest("");
    // Smart-db prompt
    if (!INVESTIGATIONS.includes(val)) {
      try {
        fetch(`${BASE_URL}/master-db`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ type: "investigation", value: val }),
        }).catch(() => {});
      } catch {}
    }
  };

  const filteredTests = INVESTIGATIONS.filter(t =>
    t.toLowerCase().includes(testSearch.toLowerCase())
  );

  const handleProceed = () => {
    const bmi = vitals.height && vitals.weight
      ? Number((vitals.weight / ((vitals.height / 100) ** 2)).toFixed(1))
      : undefined;

    sessionStorage.setItem("currentDiagnosis", JSON.stringify({
      patientId,
      problems:       selectedComplaints,
      investigations: selectedTests,
      vitals:         { ...vitals, bmi },
    }));
    navigate("/doctor/prescription");
  };

  // ── Smart DB prompt for new complaint ──
  const handleSmartDbAdd = async () => {
    if (!addingCustom) return;
    try {
      await fetch(`${BASE_URL}/master-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ type: "complaint", value: addingCustom }),
      });
    } catch {}
    setAddingCustom(null);
  };

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate("/doctor/dashboard")}
          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">{patient.name}</h1>
            <p className="text-xs text-muted-foreground">
              {patient.age} yrs • {patient.gender}
              {(patient as any).bloodGroup && ` • ${(patient as any).bloodGroup}`}
            </p>
          </div>
        </div>
        <button onClick={() => { refreshQueue(); refreshPatients(); }}
          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6 pb-32">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* ── Vitals (Feature 2) ── */}
          <VitalsSection vitals={vitals} onChange={updateVital} />

          {/* ── Complaints with Duration (Feature 1) ── */}
          <div>
            <SectionHeader num={1} label="Patient Complaints" />

            {/* Selected complaints */}
            {selectedComplaints.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedComplaints.map(c => (
                  <span key={c}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                    {c}
                    <button onClick={() => setSelectedComplaints(prev => prev.filter(x => x !== c))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Smart DB prompt (Feature 10) */}
            <AnimatePresence>
              {addingCustom && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-3">
                  <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
                    Add "<strong>{addingCustom}</strong>" to ClinIQ Database for future suggestions?
                  </span>
                  <button onClick={handleSmartDbAdd}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600">Add</button>
                  <button onClick={() => setAddingCustom(null)}
                    className="px-3 py-1 rounded-lg border border-amber-300 text-amber-700 dark:text-amber-300 text-xs hover:bg-amber-50">Cancel</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Complaint chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {COMPLAINTS_SIMPLE.map(c => (
                <Chip key={c} label={c}
                  selected={isComplaintSelected(c)}
                  onClick={() => handleComplaintClick(c)} />
              ))}
              {Object.keys(COMPLAINTS_WITH_SUB).map(c => (
                <Chip key={c} label={`${c} ›`}
                  selected={isComplaintSelected(c)}
                  onClick={() => handleComplaintClick(c)} />
              ))}
            </div>

            {/* Custom complaint input */}
            <div className="flex gap-2">
              <Input placeholder="Type custom complaint..." value={customComplaint}
                onChange={e => setCustomComplaint(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCustomComplaint(); }}
                className="flex-1 h-10 rounded-xl text-sm" />
              <Button variant="outline" size="sm" onClick={addCustomComplaint}
                disabled={!customComplaint.trim()} className="h-10 rounded-xl px-3 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </div>

          {/* ── Investigations ── */}
          <div>
            <SectionHeader num={2} label="Investigations Advised" />

            {selectedTests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTests.map(t => (
                  <span key={t}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                    {t}
                    <button onClick={() => toggleTest(t)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search tests..." value={testSearch}
                onChange={e => setTestSearch(e.target.value)}
                className="pl-9 h-11 rounded-xl" />
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {filteredTests.map(t => (
                <Chip key={t} label={t}
                  selected={selectedTests.includes(t)}
                  onClick={() => toggleTest(t)} />
              ))}
            </div>

            {/* Custom investigation */}
            <div className="flex gap-2">
              <Input placeholder="Add custom test..." value={customTest}
                onChange={e => setCustomTest(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCustomTestFn(); }}
                className="flex-1 h-10 rounded-xl text-sm" />
              <Button variant="outline" size="sm" onClick={addCustomTestFn}
                disabled={!customTest.trim()} className="h-10 rounded-xl px-3 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </div>

        </motion.div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <Button onClick={handleProceed} className="w-full h-12 rounded-xl text-base font-medium gap-2" size="lg">
            Continue to Prescription <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sub-area modal */}
      <AnimatePresence>
        {subModal && (
          <SubAreaModal complaint={subModal} areas={COMPLAINTS_WITH_SUB[subModal]}
            onSelect={handleSubSelect}
            onClose={() => setSubModal(null)} />
        )}
      </AnimatePresence>

      {/* Duration modal (Feature 1) */}
      <AnimatePresence>
        {pendingLabel && (
          <DurationModal complaint={pendingLabel}
            onSelect={handleDurationSelect}
            onClose={() => setPendingLabel(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorDiagnosis;
