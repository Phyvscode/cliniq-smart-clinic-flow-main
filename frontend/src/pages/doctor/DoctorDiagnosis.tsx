import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, Search, Plus, X, ArrowRight, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClinic } from "@/context/ClinicContext";

const COMMON_PROBLEMS = [
  "Fever","Cold & Cough","Headache","Body Pain","Sore Throat",
  "Stomach Ache","Diarrhea","Vomiting","Skin Rash","Allergies",
  "Back Pain","Joint Pain","Chest Pain","Breathing Difficulty",
  "Diabetes Follow-up","Hypertension Follow-up","Ear Pain",
  "Eye Irritation","Urinary Issues","General Checkup",
];

const COMMON_DIAGNOSES = [
  "Viral Upper Respiratory Tract Infection","Acute Gastroenteritis",
  "Tension Headache","Migraine","Hypertension","Type 2 Diabetes Mellitus",
  "Urinary Tract Infection","Allergic Rhinitis","Acute Pharyngitis",
  "Bronchitis","Anaemia","Vitamin D Deficiency","Hypothyroidism",
  "Osteoarthritis","Anxiety Disorder","Acid Peptic Disease",
  "Skin Infection","Conjunctivitis","Otitis Media","Lower Back Pain",
];

const DoctorDiagnosis = () => {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const patientId       = searchParams.get("patientId");
  const { patients }    = useClinic();
  const patient         = patients.find(p => p.id === patientId);

  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [customProblem,    setCustomProblem]     = useState("");
  const [searchProblem,    setSearchProblem]     = useState("");
  const [diagnosisSearch,  setDiagnosisSearch]   = useState("");
  const [selectedDiag,     setSelectedDiag]      = useState("");
  const [customDiag,       setCustomDiag]        = useState("");

  const filteredProblems  = COMMON_PROBLEMS.filter(p =>
    p.toLowerCase().includes(searchProblem.toLowerCase()) && !selectedProblems.includes(p)
  );
  const filteredDiagnoses = COMMON_DIAGNOSES.filter(d =>
    d.toLowerCase().includes(diagnosisSearch.toLowerCase())
  );

  const toggleProblem = (p: string) =>
    setSelectedProblems(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const addCustomProblem = () => {
    const t = customProblem.trim();
    if (t && !selectedProblems.includes(t)) { setSelectedProblems(p => [...p, t]); setCustomProblem(""); }
  };

  const handleProceed = () => {
    const finalDiagnosis = selectedDiag || customDiag.trim();
    sessionStorage.setItem("currentDiagnosis", JSON.stringify({
      patientId, problems: selectedProblems, diagnosis: finalDiagnosis,
    }));
    navigate("/doctor/prescription");
  };

  if (!patient) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Patient not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
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
              {patient.age} yrs · {patient.gender}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>

          {/* ── Chief Complaints ── */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Chief Complaints</h2>
            <p className="text-sm text-muted-foreground mb-5">Select the patient's symptoms</p>

            {selectedProblems.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Selected ({selectedProblems.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedProblems.map(p => (
                    <Badge key={p} variant="default"
                      className="gap-1.5 py-1.5 px-3 text-sm cursor-pointer hover:bg-primary/80"
                      onClick={() => toggleProblem(p)}>
                      {p}<X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search symptoms…" value={searchProblem}
                onChange={e => setSearchProblem(e.target.value)} className="pl-9 h-11 rounded-xl" />
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {filteredProblems.map(p => (
                <motion.button key={p} whileTap={{ scale:0.95 }} onClick={() => toggleProblem(p)}
                  className="px-4 py-2 rounded-xl border border-border text-sm text-foreground hover:border-primary hover:bg-primary/5 transition-all">
                  {p}
                </motion.button>
              ))}
              {filteredProblems.length === 0 && searchProblem && (
                <p className="text-sm text-muted-foreground italic">No matching symptoms</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Add Custom Symptom
              </p>
              <div className="flex gap-2">
                <Input placeholder="Type a symptom not listed above…"
                  value={customProblem} onChange={e => setCustomProblem(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustomProblem()}
                  className="rounded-xl flex-1 h-11" />
                <Button size="icon" variant="outline" onClick={addCustomProblem}
                  disabled={!customProblem.trim()} className="rounded-xl h-11 w-11">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* ── Diagnosis ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Diagnosis</h2>
              <span className="text-xs text-muted-foreground">(optional)</span>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Will be printed on the prescription PDF
            </p>

            {selectedDiag && (
              <div className="mb-4">
                <Badge variant="default" className="gap-1.5 py-1.5 px-3 text-sm">
                  {selectedDiag}
                  <button onClick={() => setSelectedDiag("")}><X className="w-3 h-3" /></button>
                </Badge>
              </div>
            )}

            {!selectedDiag && (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search common diagnoses…"
                    value={diagnosisSearch} onChange={e => setDiagnosisSearch(e.target.value)}
                    className="pl-9 h-11 rounded-xl" />
                </div>

                {diagnosisSearch && (
                  <div className="bg-card border border-border rounded-xl mb-3 max-h-48 overflow-y-auto shadow-sm">
                    {filteredDiagnoses.length === 0
                      ? <p className="text-sm text-muted-foreground text-center py-4">No match</p>
                      : filteredDiagnoses.map(d => (
                        <button key={d}
                          onClick={() => { setSelectedDiag(d); setDiagnosisSearch(""); setCustomDiag(""); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                          {d}
                        </button>
                      ))}
                  </div>
                )}

                {!diagnosisSearch && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {COMMON_DIAGNOSES.slice(0, 8).map(d => (
                      <motion.button key={d} whileTap={{ scale:0.95 }}
                        onClick={() => { setSelectedDiag(d); setCustomDiag(""); }}
                        className="px-3 py-1.5 rounded-xl border border-border text-xs text-foreground hover:border-primary hover:bg-primary/5 transition-all">
                        {d}
                      </motion.button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Write Custom Diagnosis
              </p>
              <textarea
                placeholder="e.g. Acute viral pharyngitis with secondary bacterial infection…"
                value={customDiag}
                onChange={e => { setCustomDiag(e.target.value); if (e.target.value) setSelectedDiag(""); }}
                rows={3}
                className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

        </motion.div>

        <div className="sticky bottom-6">
          <Button onClick={handleProceed} disabled={selectedProblems.length === 0}
            className="w-full h-12 rounded-xl text-base font-medium gap-2" size="lg">
            Proceed to Prescription <ArrowRight className="w-4 h-4" />
          </Button>
          {selectedProblems.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Select at least one symptom to proceed
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDiagnosis;