import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, UserPlus, Check, Phone, ChevronDown, UserX, Baby, CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";
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

const ReceptionChildren = () => {
  const { addPatient, refreshQueue } = useClinic();
  const navigate = useNavigate();

  const [phone,        setPhone]        = useState("");
  const [searched,     setSearched]     = useState(false);
  const [searching,    setSearching]    = useState(false);
  const [children,     setChildren]     = useState<any[]>([]);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [addingNew,    setAddingNew]    = useState(false);

  const [childName,    setChildName]    = useState("");
  const [childDob,     setChildDob]     = useState("");
  const [childGender,  setChildGender]  = useState<"Male"|"Female"|"Other"|"">("");
  const [parentName,   setParentName]   = useState("");

  const [department,   setDepartment]   = useState("");
  const [loading,       setLoading]      = useState(false);
  const [success,       setSuccess]      = useState("");
  const [error,         setError]        = useState("");
  const [noDoctorAlert, setNoDoctorAlert] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 25}-01-01`;

  const resetSelection = () => {
    setChildren([]); setSearched(false); setSelectedId(null); setAddingNew(false);
    setChildName(""); setChildDob(""); setChildGender(""); setParentName("");
    setSuccess(""); setError("");
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    resetSelection();
    clearTimeout(timerRef.current);
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7) return;
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await apiGetPatients(digits, true);
        const list = r.patients || [];
        setChildren(list);
        setSearched(true);
        if (list.length === 0) setAddingNew(true);
      } catch {} finally { setSearching(false); }
    }, 300);
  };

  const selectedChild = children.find(c => String(c._id) === selectedId) || null;

  const handleSubmit = async () => {
    if (!department) { setError("Please select a department."); return; }
    setError(""); setLoading(true);
    try {
      let patient: any = selectedChild ? { id: String(selectedChild._id), name: selectedChild.name } : null;
      if (!patient) {
        if (!childName.trim() || !childDob || !childGender) { setError("Fill in the child's name, date of birth, and gender."); setLoading(false); return; }
        patient = await addPatient({
          name: childName.trim(), dateOfBirth: childDob,
          age: calculateAge(childDob), gender: childGender, phone: phone.trim(),
          visitType: "OPD", isChild: true,
          ...(parentName.trim() ? { relativeName: parentName.trim() } : {}),
        } as any);
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
      setTimeout(() => { setPhone(""); resetSelection(); setDepartment(""); navigate("/reception/dashboard"); }, 1500);
    } catch (err: any) { setError(err.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="children" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-10 flex justify-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="w-full max-w-lg">
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">CHILDREN</p>
            <h1 className="text-4xl font-serif text-gray-900 dark:text-white leading-tight mb-1.5">
              Register a <em className="text-gray-400 dark:text-gray-600 italic font-serif">child patient</em>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Enter the parent's phone number — children already registered under it will show up here.
            </p>

            <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-6 space-y-5">
              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
                </div>
              )}

              {/* Parent phone */}
              <div>
                <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">PARENT'S PHONE NUMBER</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    type="tel"
                    placeholder="Enter parent's phone number…"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    className="pl-9 h-11 rounded-xl pr-9"
                    autoComplete="off"
                  />
                  {searching && (
                    <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* Existing children for this phone */}
              {searched && children.length > 0 && !addingNew && (
                <div>
                  <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">
                    {children.length} CHILD{children.length > 1 ? "REN" : ""} REGISTERED · WHO HAS COME IN?
                  </label>
                  <div className="space-y-2">
                    {children.map((c: any) => {
                      const isSel = selectedId === String(c._id);
                      return (
                        <button key={c._id} onClick={() => setSelectedId(String(c._id))}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                            isSel
                              ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                            c.gender === "Female"
                              ? "bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400"
                              : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                          }`}>
                            <Baby className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{c.age ?? ""} yrs · {c.gender}</p>
                          </div>
                          {isSel && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => { setAddingNew(true); setSelectedId(null); }}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 transition-colors">
                    <UserPlus className="w-3.5 h-3.5" /> Add another child under this number
                  </button>
                </div>
              )}

              {/* New child form */}
              <AnimatePresence mode="wait">
                {addingNew && (
                  <motion.div key="new-child" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {children.length > 0 ? "Register a new child for this number" : "First visit — register the child"}
                      </p>
                      {children.length > 0 && (
                        <button onClick={() => setAddingNew(false)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Cancel</button>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">CHILD'S FULL NAME</label>
                      <Input placeholder="Child's full name" value={childName} onChange={e => setChildName(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">DATE OF BIRTH</label>
                      <Input type="date" value={childDob} min={minDate} max={maxDate} onChange={e => setChildDob(e.target.value)} className="h-11 rounded-xl" />
                      {childDob && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Age: {calculateAge(childDob)} yrs</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">GENDER</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Male","Female","Other"] as const).map(g => (
                          <button key={g} type="button" onClick={() => setChildGender(g)}
                            className={`h-11 rounded-xl border text-sm font-medium transition-all ${childGender === g ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 mb-2 block">PARENT'S NAME (OPTIONAL)</label>
                      <Input placeholder="e.g. Mrs. Sharma" value={parentName} onChange={e => setParentName(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Department + submit, once a child is chosen or being registered */}
              {(selectedChild || addingNew) && (
                <>
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

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button onClick={handleSubmit} disabled={loading || !department}
                    className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adding…</> : <><UserPlus className="w-4 h-4" /> Add to Queue</>}
                  </button>
                </>
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

export default ReceptionChildren;
