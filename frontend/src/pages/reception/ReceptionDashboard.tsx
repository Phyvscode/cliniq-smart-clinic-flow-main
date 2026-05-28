import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChangePinModal from "@/components/ChangePinModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Phone, UserCheck, CheckCircle2, ChevronDown,
  Trash2, RefreshCw, Search, UserX, ClipboardList, LogOut, KeyRound,
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

const DEPARTMENTS = [
  "General Medicine", "Pediatrics", "Gynecology", "Orthopedics",
  "Dermatology", "ENT", "Cardiology", "Neurology", "Ophthalmology", "Dentistry",
];

type Step = "idle" | "found" | "new";
type Tab  = "register" | "queue" | "manage";

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
      await addToQueue(patient.id);
      setConfirmation(`${patient.name} added to queue — ${department}`);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally { setLoading(false); }
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