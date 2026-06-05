import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Search, Plus, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";

// ── Complaints ─────────────────────────────────────────────────────────────
const COMPLAINTS_SIMPLE = [
  "Fever", "Cold", "Cough", "Headache", "Vomiting", "Loose Motions",
  "Weakness", "Chest Pain", "Breathlessness", "Allergy", "Sore Throat",
  "Acidity", "Nausea", "Dizziness",
];

const BODY_AREAS = ["Head", "Chest", "Abdomen", "Back", "Leg", "Knee", "Shoulder", "Neck", "Joint"];
const PAIN_AREAS = [...BODY_AREAS, "Ear", "Tooth"];

const COMPLAINTS_WITH_SUB: Record<string, string[]> = {
  "Body Ache": BODY_AREAS,
  "Pain":      PAIN_AREAS,
};

// ── Investigations ──────────────────────────────────────────────────────────
const INVESTIGATIONS = [
  "CBC", "LFT", "KFT", "Lipid Profile", "Blood Sugar (Fasting)",
  "Blood Sugar (PP)", "HbA1c", "Urine Routine", "X-Ray Chest", "X-Ray",
  "CT Scan", "MRI", "ECG", "Echo", "Thyroid Profile", "Dengue Test",
  "Malaria Test", "Typhoid (Widal)", "USG Abdomen", "CRP", "ESR",
  "Vitamin D", "Vitamin B12",
];

// ── Sub-area Modal ──────────────────────────────────────────────────────────
const SubAreaModal = ({
  complaint, areas, onSelect, onClose,
}: {
  complaint: string;
  areas: string[];
  onSelect: (label: string) => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-foreground text-lg">{complaint}</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Select area</p>
      <div className="flex flex-wrap gap-2">
        {areas.map(area => (
          <button
            key={area}
            onClick={() => { onSelect(`${complaint} - ${area}`); onClose(); }}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {area}
          </button>
        ))}
      </div>
      <button
        onClick={() => { onSelect(complaint); onClose(); }}
        className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Add "{complaint}" without specifying area
      </button>
    </motion.div>
  </div>
);

// ── Chip ────────────────────────────────────────────────────────────────────
const Chip = ({
  label, selected, onClick,
}: {
  label: string; selected: boolean; onClick: () => void;
}) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
      selected
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-foreground border-border hover:border-primary hover:bg-primary/5"
    }`}
  >
    {label}
  </motion.button>
);

// ── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ num, label }: { num: number; label: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
      {num}
    </span>
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────────
const DoctorDiagnosis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");
  const { patients } = useClinic();
  const patient = patients.find(p => p.id === patientId);

  // Section 1 — Complaints
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [subModal, setSubModal] = useState<string | null>(null);

  // Section 2 — Investigations
  const [selectedTests, setSelectedTests]     = useState<string[]>([]);
  const [testSearch, setTestSearch]           = useState("");


  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const handleComplaintClick = (complaint: string) => {
    const areas = COMPLAINTS_WITH_SUB[complaint];
    if (areas) {
      if (selectedComplaints.some(c => c === complaint || c.startsWith(`${complaint} - `))) {
        // Remove all variants
        setSelectedComplaints(prev => prev.filter(c => c !== complaint && !c.startsWith(`${complaint} - `)));
      } else {
        setSubModal(complaint);
      }
    } else {
      toggleItem(selectedComplaints, setSelectedComplaints, complaint);
    }
  };

  const isComplaintSelected = (complaint: string) =>
    selectedComplaints.some(c => c === complaint || c.startsWith(`${complaint} - `));

  const filteredTests = INVESTIGATIONS.filter(t =>
    t.toLowerCase().includes(testSearch.toLowerCase())
  );

  const handleProceed = () => {
    sessionStorage.setItem("currentDiagnosis", JSON.stringify({
      patientId,
      problems:       selectedComplaints,
      investigations: selectedTests,
    }));
    navigate("/doctor/prescription");
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
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate("/doctor/dashboard")}
          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
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
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-8 pb-32">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {/* ── Section 1: Patient Complaints ── */}
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

            {/* Complaint chips */}
            <div className="flex flex-wrap gap-2">
              {COMPLAINTS_SIMPLE.map(c => (
                <Chip key={c} label={c}
                  selected={selectedComplaints.includes(c)}
                  onClick={() => handleComplaintClick(c)} />
              ))}
              {Object.keys(COMPLAINTS_WITH_SUB).map(c => (
                <Chip key={c} label={`${c} ›`}
                  selected={isComplaintSelected(c)}
                  onClick={() => handleComplaintClick(c)} />
              ))}
            </div>
          </div>

          {/* ── Section 2: Investigations ── */}
          <div>
            <SectionHeader num={2} label="Investigations Advised" />

            {selectedTests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTests.map(t => (
                  <span key={t}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                    {t}
                    <button onClick={() => toggleItem(selectedTests, setSelectedTests, t)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tests..."
                value={testSearch}
                onChange={e => setTestSearch(e.target.value)}
                className="pl-9 h-11 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filteredTests.map(t => (
                <Chip key={t} label={t}
                  selected={selectedTests.includes(t)}
                  onClick={() => toggleItem(selectedTests, setSelectedTests, t)} />
              ))}
            </div>
          </div>


        </motion.div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleProceed}
            disabled={false}
            className="w-full h-12 rounded-xl text-base font-medium gap-2"
            size="lg"
          >
            Continue to Prescription <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sub-area modal */}
      <AnimatePresence>
        {subModal && (
          <SubAreaModal
            complaint={subModal}
            areas={COMPLAINTS_WITH_SUB[subModal]}
            onSelect={item => setSelectedComplaints(prev =>
              prev.includes(item) ? prev : [...prev, item]
            )}
            onClose={() => setSubModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorDiagnosis;