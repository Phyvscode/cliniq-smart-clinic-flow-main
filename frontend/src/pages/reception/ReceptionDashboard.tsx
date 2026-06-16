import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Bell, RefreshCw, X, UserPlus, Check, UserCheck,
  Phone, ChevronDown, Users, UserX, Clock, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";
import { Patient } from "@/data/mockData";
import { apiUpdateQueueStatus } from "@/lib/api";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import ChangePinModal from "@/components/ChangePinModal";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

// ── API helpers ───────────────────────────────────────────────────────────────
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

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  "General Medicine","Pediatrics","Gynecology","Orthopedics",
  "Dermatology","ENT","Cardiology","Neurology","Ophthalmology","Dentistry",
];

const calculateAge = (dob: string) => {
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};
const toDateInput = (val: any): string => {
  if (!val) return "";
  try { return new Date(val).toISOString().split("T")[0]; } catch { return ""; }
};
const displayAge = (p: any) => p?.dateOfBirth ? calculateAge(toDateInput(p.dateOfBirth)) : (p?.age ?? 0);

// ── Register Modal ────────────────────────────────────────────────────────────
const RegisterModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { addPatient, refreshQueue } = useClinic();
  const [department,    setDepartment]    = useState("");
  const [phone,         setPhone]         = useState("");
  const [step,          setStep]          = useState<"idle"|"found"|"new">("idle");
  const [foundPatient,  setFoundPatient]  = useState<Patient | null>(null);
  const [name,          setName]          = useState("");
  const [dob,           setDob]           = useState("");
  const [gender,        setGender]        = useState<"Male"|"Female"|"Other"|"">("");
  const [loading,       setLoading]       = useState(false);
  const [success,       setSuccess]       = useState("");
  const [error,         setError]         = useState("");
  const [noDoctorAlert, setNoDoctorAlert] = useState(false);

  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 120}-01-01`;

  const handlePhoneLookup = async () => {
    if (phone.trim().length < 7) return;
    setError("");
    const existing = await apiLookupPhone(phone.trim());
    if (existing) { setFoundPatient(existing); setStep("found"); }
    else           { setFoundPatient(null); setStep("new"); }
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
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err: any) { setError(err.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-serif text-gray-900 dark:text-white">Add patient to queue</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
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
          {/* Phone */}
          <div>
            <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">PHONE NUMBER</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="tel" placeholder="Enter phone number…" value={phone}
                  onChange={e => { setPhone(e.target.value); setStep("idle"); setFoundPatient(null); }}
                  onKeyDown={e => e.key === "Enter" && handlePhoneLookup()}
                  className="pl-9 h-11 rounded-xl" />
              </div>
              <button onClick={handlePhoneLookup} className="h-11 px-4 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                Search
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "found" && foundPatient && (
              <motion.div key="found" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3 flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{foundPatient.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{displayAge(foundPatient)} yrs · {foundPatient.gender} · existing patient</p>
                </div>
              </motion.div>
            )}
            {step === "new" && (
              <motion.div key="new" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2.5">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">New patient — please fill in their details</p>
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
      </motion.div>
    </div>
  );
};


// ── Main Component ────────────────────────────────────────────────────────────
const ReceptionDashboard = () => {
  const { queue, patients, refreshQueue, refreshPatients, removeFromQueue } = useClinic();
  const [search,          setSearch]          = useState("");
  const [showRegister,    setShowRegister]    = useState(false);
  const [showChangePin,   setShowChangePin]   = useState(false);
  const [markingDone,     setMarkingDone]     = useState<string | null>(null);
  const [removing,        setRemoving]        = useState<string | null>(null);
  const [registerKey,     setRegisterKey]     = useState(0);

  useEffect(() => {
    refreshQueue(); refreshPatients();
    const id = setInterval(() => { refreshQueue(); refreshPatients(); }, 5000);
    return () => clearInterval(id);
  }, []);

  const rows = queue
    .map(q => ({
      entry:   q,
      patient: (q as any)._patient || patients.find(p => p.id === q.patientId) || null,
      doctor:  (q as any)._doctor || (q as any).doctor || null,
    }))
    .filter(r => r.patient)
    .filter(r => !search || r.patient!.name.toLowerCase().includes(search.toLowerCase()));

  const waitingCount   = rows.filter(r => r.entry.status === "waiting").length;
  const inRoomCount    = rows.filter(r => r.entry.status === "in-consultation").length;
  const completedCount = rows.filter(r => r.entry.status === "done").length;

  const handleMarkDone = async (entryId: string) => {
    setMarkingDone(entryId);
    try { await apiUpdateQueueStatus(entryId, "done"); await refreshQueue(); }
    catch {}
    finally { setMarkingDone(null); }
  };
  const handleRemove = async (entryId: string) => {
    setRemoving(entryId);
    try { await removeFromQueue(entryId); }
    catch {}
    finally { setRemoving(null); }
  };

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="reception" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients, doctors, actions..."
              className="w-full h-9 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-10 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 dark:focus:border-white/20 transition-colors" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 dark:text-gray-700 border border-gray-200 dark:border-gray-700 rounded px-1">⌘K</span>
          </div>
          <button onClick={() => setShowChangePin(true)} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Change PIN">
            <KeyRound className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Heading */}
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">
                  LIVE QUEUE · {rows.length} PATIENT{rows.length !== 1 ? "S" : ""}
                </p>
                <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-1.5">
                  Front desk is{" "}
                  <em className="text-gray-400 dark:text-gray-600 italic font-serif">ready</em>
                  {" "}for the day.
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Register a patient and they'll appear instantly in the live queue.</p>
              </div>
              <button onClick={() => { setShowRegister(true); setRegisterKey(k => k + 1); }}
                className="h-11 px-5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors shrink-0 mt-1">
                <UserPlus className="w-4 h-4" /> Add patient to queue
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "WAITING",    value: waitingCount,   sub: "in lobby now",    icon: Clock    },
                { label: "IN ROOM",    value: inRoomCount,    sub: "active consults",  icon: Users    },
                { label: "COMPLETED",  value: completedCount, sub: "seen today",        icon: Check   },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600">{s.label}</p>
                    <s.icon className="w-4 h-4 text-gray-300 dark:text-gray-700" strokeWidth={1.5} />
                  </div>
                  <p className="text-5xl font-serif text-gray-900 dark:text-white mb-1">{s.value}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Queue table */}
            {rows.length === 0 ? (
              <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 py-16 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" strokeWidth={1.5} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {search ? "No patients match your search." : "Queue is empty. Register a patient to begin."}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                {rows.map((row, i) => {
                  const isDone   = row.entry.status === "done";
                  const isInRoom = row.entry.status === "in-consultation";
                  const p        = row.patient!;
                  const docName  = row.doctor?.name || (row.entry as any).doctorName || "";
                  const dept     = (row.entry as any).department || (row.doctor as any)?.specialization || "General Medicine";
                  const referred = (row.entry as any).referredBy;

                  return (
                    <motion.div key={row.entry.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-5 px-6 py-4 ${i > 0 ? "border-t border-gray-100 dark:border-white/5" : ""}`}>
                      {/* Token */}
                      <div className="w-20 shrink-0">
                        <p className="text-[9px] font-semibold tracking-widest text-gray-400 dark:text-gray-600">TOKEN</p>
                        <p className="text-2xl font-serif text-gray-900 dark:text-white">#{row.entry.queueNumber || "—"}</p>
                      </div>

                      {/* Patient */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isDone ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>
                          {p.name}
                          <span className="font-normal text-gray-400 dark:text-gray-600"> · {(p as any).gender?.charAt(0) || "?"}</span>
                          {(p as any).age && <span className="font-normal text-gray-400 dark:text-gray-600">{(p as any).age}M</span>}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-600 truncate">
                          {p.phone || "—"}
                          {referred ? ` · Referred by Dr. ${referred}` : ""}
                        </p>
                      </div>

                      {/* Doctor */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDone ? "text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}`}>
                          {docName ? `Dr. ${docName}` : "—"}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-600">{dept}</p>
                      </div>

                      {/* Status */}
                      <div className="w-24 shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600">Done</span>
                        ) : isInRoom ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> In room
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Waiting
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isDone && isInRoom && (
                          <button onClick={() => handleMarkDone(row.entry.id)} disabled={markingDone === row.entry.id}
                            className="h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                            {markingDone === row.entry.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                            Mark done
                          </button>
                        )}
                        <button onClick={() => handleRemove(row.entry.id)} disabled={removing === row.entry.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-gray-200 dark:border-gray-700 transition-all">
                          {removing === row.entry.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showRegister && (
          <RegisterModal key={registerKey} onClose={() => setShowRegister(false)} onSuccess={() => { refreshQueue(); }} />
        )}
      </AnimatePresence>
      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default ReceptionDashboard;
