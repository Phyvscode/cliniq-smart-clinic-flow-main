import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, X, Check, FlaskConical, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import { apiGetPatients, apiCreateLabOrder } from "@/lib/api";

const TESTS = [
  "CBC", "Blood Sugar Fasting", "HbA1c", "Lipid Profile",
  "LFT", "KFT", "Thyroid Profile", "Urine Routine",
  "X-Ray Chest", "ECG", "USG Abdomen", "CT Scan",
  "Dengue Test", "Malaria Test", "Vitamin D", "Vitamin B12",
];

const DoctorLaboratory = () => {
  const [patientSearch,  setPatientSearch]  = useState("");
  const [patients,       setPatients]       = useState<any[]>([]);
  const [searching,      setSearching]      = useState(false);
  const [selectedPatient,setSelectedPatient]= useState<any>(null);
  const [showDrop,       setShowDrop]       = useState(false);
  const [selectedTests,  setSelectedTests]  = useState<string[]>([]);
  const [notes,          setNotes]          = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [success,        setSuccess]        = useState("");
  const [error,          setError]          = useState("");

  const searchPatients = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setPatients([]); return; }
    setSearching(true);
    try {
      const r = await apiGetPatients(q);
      setPatients((r.patients || []).slice(0, 8));
    } catch {} finally { setSearching(false); }
  }, []);

  const handleSearchChange = (value: string) => {
    setPatientSearch(value);
    setShowDrop(true);
    const timer = setTimeout(() => searchPatients(value), 300);
    return () => clearTimeout(timer);
  };

  const selectPatient = (p: any) => {
    setSelectedPatient(p);
    setPatientSearch(p.name);
    setShowDrop(false);
    setPatients([]);
    setError("");
  };

  const toggleTest = (test: string) => {
    setSelectedTests(prev =>
      prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test]
    );
  };

  const handleSubmit = async () => {
    if (!selectedPatient)         { setError("Please select a patient."); return; }
    if (selectedTests.length === 0) { setError("Please select at least one test."); return; }
    setSubmitting(true); setError("");
    try {
      await apiCreateLabOrder({
        patientId: selectedPatient._id || selectedPatient.id,
        tests:     selectedTests,
        notes:     notes.trim() || undefined,
      });
      setSuccess(`Lab order sent for ${selectedPatient.name} (${selectedTests.length} test${selectedTests.length > 1 ? "s" : ""})`);
      setSelectedPatient(null);
      setPatientSearch("");
      setSelectedTests([]);
      setNotes("");
      setTimeout(() => setSuccess(""), 5000);
    } catch (e: any) { setError(e.message || "Failed to send lab order"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <DoctorSidebar active="laboratory" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0 h-[57px]" />

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">SEND TO LABORATORY</p>
            <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-8">
              Order{" "}
              <em className="text-gray-400 dark:text-gray-600 italic font-serif">tests</em>{" "}
              for a patient.
            </h1>

            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3 mb-6 max-w-3xl">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-6 max-w-4xl">
              {/* Left: Patient + Notes + Submit */}
              <div className="w-72 shrink-0 space-y-4">
                {/* Patient search */}
                <div className="bg-white dark:bg-[#0d0d1a] border border-gray-100 dark:border-white/8 rounded-2xl p-5">
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">PATIENT</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      placeholder="Search by name or phone…"
                      value={patientSearch}
                      onChange={e => handleSearchChange(e.target.value)}
                      onFocus={() => patientSearch.length >= 2 && setShowDrop(true)}
                      className="pl-8 h-10 rounded-xl text-sm"
                    />
                    {searching && (
                      <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
                    )}
                    <AnimatePresence>
                      {showDrop && patients.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowDrop(false)} />
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-30 overflow-hidden max-h-64 overflow-y-auto">
                            {patients.map(p => (
                              <button key={p._id || p.id} onClick={() => selectPatient(p)}
                                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-left transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {p.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                                  <p className="text-xs text-gray-400">{p.phone} · {p.age ? `${p.age}y` : ""} {p.gender || ""}</p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {selectedPatient && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {selectedPatient.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedPatient.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPatient.phone}</p>
                        </div>
                        <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notes */}
                <div className="bg-white dark:bg-[#0d0d1a] border border-gray-100 dark:border-white/8 rounded-2xl p-5">
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">NOTES (optional)</p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Clinical notes for the lab…"
                    rows={3}
                    className="w-full text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 resize-none focus:outline-none placeholder:text-gray-400"
                  />
                </div>

                {/* Submit */}
                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
                <button onClick={handleSubmit} disabled={submitting || !selectedPatient || selectedTests.length === 0}
                  className="w-full h-12 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {submitting
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                    : <>Send to Lab ({selectedTests.length}) <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>

              {/* Right: Test selection */}
              <div className="flex-1 bg-white dark:bg-[#0d0d1a] border border-gray-100 dark:border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600">SELECT TESTS</p>
                  {selectedTests.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{selectedTests.length} selected</span>
                      <button onClick={() => setSelectedTests([])}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {TESTS.map(test => {
                    const isSelected = selectedTests.includes(test);
                    return (
                      <button key={test} onClick={() => toggleTest(test)}
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left text-sm font-medium transition-all ${
                          isSelected
                            ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                            : "border-gray-100 dark:border-white/8 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-white dark:bg-gray-900 border-white dark:border-gray-900"
                            : "border-gray-300 dark:border-gray-600"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-gray-900 dark:text-white" />}
                        </div>
                        <FlaskConical className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white/60 dark:text-gray-900/60" : "text-gray-400"}`} strokeWidth={1.5} />
                        <span className="flex-1 leading-tight">{test}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DoctorLaboratory;
