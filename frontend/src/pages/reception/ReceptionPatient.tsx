import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, X, UserPlus, Check, UserCheck,
  Phone, ChevronDown, UserX,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";
import { Patient } from "@/data/mockData";
import { apiGetPatients } from "@/lib/api";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import { useNavigate } from "react-router-dom";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

const apiAddToQueue = async (patientId: string, department: string) => {
  const res = await fetch(`${BASE_URL}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ patientId, department }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to add to queue");
  return data;
};

const DEPARTMENTS = [
  "General Medicine","Pediatrics","Gynecology","Orthopedics",
  "Dermatology","ENT","Cardiology","Ophthalmology","Psychiatry","Pulmonology",
];

const calculateAge = (dob: string) => {
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// ── Main Component ────────────────────────────────────────────────────────────
const ReceptionPatient = () => {
  const { addPatient, refreshQueue } = useClinic();
  const navigate = useNavigate();

  const [department,    setDepartment]    = useState("");
  const [phone,         setPhone]         = useState("");
  const [step,          setStep]          = useState<"idle"|"found"|"new">("idle");
  const [foundPatient,  setFoundPatient]  = useState<any | null>(null);
  const [name,          setName]          = useState("");
  const [dob,           setDob]           = useState("");
  const [gender,        setGender]        = useState<"Male"|"Female"|"Other"|"">("");
  const [loading,       setLoading]       = useState(false);
  const [success,       setSuccess]       = useState("");
  const [error,         setError]         = useState("");
  const [noDoctorAlert, setNoDoctorAlert] = useState(false);
  const [suggestions,   setSuggestions]   = useState<any[]>([]);
  const [showDrop,      setShowDrop]      = useState(false);
  const [searching,     setSearching]     = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 120}-01-01`;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setStep("idle");
    setFoundPatient(null);
    setSuggestions([]);
    clearTimeout(timerRef.current);
    const digits = value.replace(/\D/g, "");
    if (digits.length < 3) { setShowDrop(false); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await apiGetPatients(digits);
        const list = r.patients || [];
        setSuggestions(list);
        setShowDrop(list.length > 0);
        if (list.length === 0 && digits.length >= 7) setStep("new");
      } catch {} finally { setSearching(false); }
    }, 300);
  };

  const selectSuggestion = (p: any) => {
    if (p._id && !p.id) p.id = String(p._id);
    setFoundPatient(p);
    setPhone(p.phone || phone);
    setStep("found");
    setShowDrop(false);
    setSuggestions([]);
  };

  const clearPatient = () => {
    setFoundPatient(null);
    setPhone("");
    setStep("idle");
    setSuggestions([]);
    setName(""); setDob(""); setGender("");
  };

  const resetForm = () => {
    setDepartment(""); setPhone(""); setStep("idle"); setFoundPatient(null);
    setName(""); setDob(""); setGender(""); setSuccess(""); setError("");
  };

  const handleSubmit = async () => {
    if (!department) { setError("Please select a department."); return; }
    setError(""); setLoading(true);
    try {
      let patient = foundPatient;
      if (!patient) {
        if (!name.trim() || !dob || !gender) { setError("Fill in name, date of birth, and gender."); setLoading(false); return; }
        patient = await addPatient({
          name: name.trim(), dateOfBirth: dob,
          age: calculateAge(dob), gender, phone: phone.trim(), visitType: "OPD",
        } as Omit<Patient, "id">);
      }
      try {
        const r = await fetch(`${BASE_URL}/auth/staff-list?role=doctor`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const d = await r.json();
        const docs = (d.staff || []).filter((doc: any) => doc.department === department || doc.specialization === department);
        if (docs.length === 0) { setNoDoctorAlert(true); setLoading(false); return; }
      } catch {}
      await apiAddToQueue(patient.id, department);
      await refreshQueue();
      setSuccess(`${patient.name} added to ${department} queue`);
      setTimeout(() => { resetForm(); navigate("/reception/dashboard"); }, 1500);
    } catch (err: any) { setError(err.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="patient" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-10 flex justify-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="w-full max-w-lg">
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">PATIENT</p>
            <h1 className="text-4xl font-serif text-gray-900 dark:text-white leading-tight mb-1.5">
              Add a patient to <em className="text-gray-400 dark:text-gray-600 italic font-serif">the queue</em>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Search by phone number, or register a new patient.</p>

            <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-6 space-y-5">
              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
                </div>
              )}

              {/* Department */}
              <div>
                <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">DEPARTMENT</label>
                <div className="relative">
                  <select value={department} onChange={e => setDepartment(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 pr-9 text-sm appearance-none focus:outline-none focus:border-gray-400 cursor-pointer">
                    <option value="">Select a department...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Phone with autocomplete */}
              <div>
                <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">PHONE NUMBER</label>
                <div className="relative" ref={dropRef}>
                  {step === "found" && foundPatient ? (
                    <div className="flex items-center gap-3 h-11 px-3 border border-emerald-300 dark:border-emerald-700 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {foundPatient.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">{foundPatient.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{foundPatient.phone} · {foundPatient.gender}</p>
                      </div>
                      <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <button onClick={clearPatient} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                      <Input
                        type="tel"
                        placeholder="Type phone number to search patient…"
                        value={phone}
                        onChange={e => handlePhoneChange(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                        className="pl-9 h-11 rounded-xl pr-9"
                        autoComplete="off"
                      />
                      {searching && (
                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
                      )}
                    </>
                  )}

                  <AnimatePresence>
                    {showDrop && suggestions.length > 0 && step !== "found" && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                        <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 px-4 pt-3 pb-1">
                          REGISTERED PATIENTS
                        </p>
                        {suggestions.map((p: any) => (
                          <button key={p._id} onClick={() => selectSuggestion(p)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                              p.gender === "Female"
                                ? "bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400"
                                : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                            }`}>
                              {p.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {p.phone} · {p.age ? `${p.age}y` : ""} {p.gender || ""}
                                {p.permanentCode && <span className="font-mono ml-1 text-gray-300 dark:text-gray-600">{p.permanentCode}</span>}
                              </p>
                            </div>
                          </button>
                        ))}
                        <button onClick={() => { setShowDrop(false); setStep("new"); setSuggestions([]); }}
                          className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <UserPlus className="w-3.5 h-3.5" /> Register as new patient instead
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* New patient form */}
              <AnimatePresence mode="wait">
                {step === "new" && (
                  <motion.div key="new" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">New patient — fill in their details</p>
                      <button onClick={() => setStep("idle")} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Cancel</button>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">FULL NAME</label>
                      <Input placeholder="Patient's full name" value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">DATE OF BIRTH</label>
                      <Input type="date" value={dob} min={minDate} max={maxDate} onChange={e => setDob(e.target.value)} className="h-11 rounded-xl" />
                      {dob && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Age: {calculateAge(dob)} yrs</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">GENDER</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Male","Female","Other"] as const).map(g => (
                          <button key={g} type="button" onClick={() => setGender(g)}
                            className={`h-11 rounded-xl border text-sm font-medium transition-all ${gender === g ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <p className="text-sm text-red-500">{error}</p>}

              {step !== "idle" && (
                <button onClick={handleSubmit} disabled={loading || !department || !phone}
                  className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adding…</> : <><UserPlus className="w-4 h-4" /> Add to Queue</>}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* No-doctor alert */}
      {noDoctorAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <UserX className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Doctors Available</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">No doctors in <strong>{department}</strong>. Ask admin to add doctors to this department first.</p>
            <button onClick={() => setNoDoctorAlert(false)} className="w-full h-10 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-sm">OK</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ReceptionPatient;
