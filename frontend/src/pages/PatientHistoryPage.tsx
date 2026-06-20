import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, RefreshCw, Search, X } from "lucide-react";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";

interface PatientInfo {
  _id:                   string;
  name:                  string;
  age?:                  number;
  gender?:               string;
  phone?:                string;
  permanentCode?:        string;
  dateOfBirth?:          string;
  appointmentType?:      string;
  visitType?:            string;
  doctorAssigned?:       string;
  bloodGroup?:           string;
  address?:              string;
  allergies?:            string;
  chronicConditions?:    string;
  currentMedications?:   string;
  severity?:             string;
  referredBy?:           string;
  department?:           string;
  email?:                string;
  relativeName?:         string;
  relativeRelationship?: string;
  relativePhone?:        string;
  occupation?:           string;
  maritalStatus?:        string;
  insuranceProvider?:    string;
}

interface QueueEntry {
  _id:         string;
  queueNumber: number;
  status:      "waiting" | "in-consultation" | "done";
  date:        string;
  department?: string;
  rxCode?:     string;
  createdAt:   string;
  patient?:    PatientInfo;
  doctor?:     { _id: string; name: string };
}

const BASE    = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const tok     = () => localStorage.getItem("cliniq_token") || "";
const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtTime = (d: string) => {
  try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return "—"; }
};

const fmtDate = (d: string) => {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return d; }
};

const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

// ── Detail slide-in panel ──────────────────────────────────────────────────────
const DetailPanel = ({ entry, onClose }: { entry: QueueEntry; onClose: () => void }) => {
  const p = entry.patient;

  const Field = ({ label, value }: { label: string; value?: string | number | null }) =>
    value != null && value !== "" ? (
      <div>
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white">{value}</p>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-start justify-end"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ x: 440, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 440, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-[420px] h-full bg-white dark:bg-[#0d0d1a] shadow-2xl flex flex-col overflow-hidden border-l border-gray-100 dark:border-white/5"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-gray-400 dark:text-gray-600">
              {p?.permanentCode || "—"}
            </span>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-bold text-2xl ${
              p?.gender === "Female"
                ? "bg-pink-100 dark:bg-pink-500/10 text-pink-500"
                : "bg-blue-100 dark:bg-blue-500/10 text-blue-500"
            }`}>
              {p?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                {p?.name || "Unknown Patient"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {p?.age != null ? `${p.age} yrs` : "—"}
                {" · "}{p?.gender || "—"}
                {" · "}{p?.phone || "—"}
              </p>
            </div>
          </div>

          {/* Visit badges */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              entry.status === "done"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : entry.status === "in-consultation"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
            }`}>
              {entry.status === "done" ? "Done" : entry.status === "in-consultation" ? "In Room" : "Waiting"}
            </span>
            <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
              Queue #{entry.queueNumber}
            </span>
            {entry.rxCode && (
              <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-500 px-2.5 py-1 rounded-full font-mono">
                {entry.rxCode}
              </span>
            )}
            {p?.severity && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                p.severity === "Critical"
                  ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                  : p.severity === "Urgent"
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
              }`}>
                {p.severity}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-600 ml-auto">{fmtTime(entry.createdAt)}</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Visit information */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 tracking-widest uppercase mb-3">
              Visit Information
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Department"       value={entry.department || "General"} />
              <Field label="Doctor"           value={entry.doctor?.name || p?.doctorAssigned} />
              <Field label="Appointment Type" value={p?.appointmentType} />
              <Field label="Visit Type"       value={p?.visitType} />
              <Field label="Referred By"      value={p?.referredBy} />
            </div>
          </div>

          {/* Personal information */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 tracking-widest uppercase mb-3">
              Personal Information
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Date of Birth"
                value={p?.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("en-IN") : null} />
              <Field label="Blood Group"    value={p?.bloodGroup} />
              <Field label="Email"          value={p?.email} />
              <Field label="Occupation"     value={p?.occupation} />
              <Field label="Marital Status" value={p?.maritalStatus} />
            </div>
            {p?.address && (
              <div className="mt-3">
                <Field label="Address" value={p.address} />
              </div>
            )}
          </div>

          {/* Medical history */}
          {(p?.allergies || p?.chronicConditions || p?.currentMedications) && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 tracking-widest uppercase mb-3">
                Medical History
              </p>
              <div className="space-y-3">
                <Field label="Allergies"            value={p?.allergies} />
                <Field label="Chronic Conditions"   value={p?.chronicConditions} />
                <Field label="Current Medications"  value={p?.currentMedications} />
              </div>
            </div>
          )}

          {/* Insurance */}
          {p?.insuranceProvider && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 tracking-widest uppercase mb-3">
                Insurance
              </p>
              <Field label="Provider" value={p.insuranceProvider} />
            </div>
          )}

          {/* Emergency contact */}
          {(p?.relativeName || p?.relativePhone) && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 tracking-widest uppercase mb-3">
                Emergency Contact
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Name"         value={p?.relativeName} />
                <Field label="Relationship" value={p?.relativeRelationship} />
                <Field label="Phone"        value={p?.relativePhone} />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────
interface Props { portal: "doctor" | "reception"; }

const PatientHistoryPage = ({ portal }: Props) => {
  const [date,     setDate]     = useState(todayISO());
  const [entries,  setEntries]  = useState<QueueEntry[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<QueueEntry | null>(null);

  const load = async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/queue/history?date=${d}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const json = await res.json();
      setEntries(json.entries || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(date); }, [date]);

  const stepDate = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    if (next <= todayISO()) setDate(next);
  };

  const filtered = entries.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const p = e.patient;
    return (
      p?.name?.toLowerCase().includes(q) ||
      p?.phone?.includes(q) ||
      (p?.permanentCode || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q) ||
      (e.doctor?.name || "").toLowerCase().includes(q) ||
      (p?.doctorAssigned || "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total:    filtered.length,
    done:     filtered.filter(e => e.status === "done").length,
    newPat:   filtered.filter(e => e.patient?.appointmentType === "New").length,
    followup: filtered.filter(e => e.patient?.appointmentType === "Follow-up").length,
  };

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      {portal === "doctor"
        ? <DoctorSidebar active="history" />
        : <ReceptionSidebar active="history" />
      }

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-200 dark:border-white/5 px-6 py-3 flex items-center gap-2 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, UHID, department or doctor…"
              className="w-full h-9 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-4 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-gray-400 dark:focus:border-white/20 transition-colors"
            />
          </div>

          {/* Date nav */}
          <button onClick={() => stepDate(-1)}
            className="w-8 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-lg leading-none">
            ‹
          </button>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={e => e.target.value && setDate(e.target.value)}
              className="pl-8 pr-3 h-9 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors cursor-pointer"
            />
          </div>
          <button onClick={() => stepDate(1)}
            disabled={date >= todayISO()}
            className="w-8 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-lg leading-none disabled:opacity-30 disabled:cursor-not-allowed">
            ›
          </button>

          <button onClick={() => load(date)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Page heading + quick date buttons */}
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-1">
                  PATIENT HISTORY
                </p>
                <h1 className="text-3xl font-serif text-gray-900 dark:text-white">
                  {fmtDate(date)}
                </h1>
              </div>
              <div className="flex items-center gap-1 mb-0.5">
                <button onClick={() => setDate(todayISO())}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    date === todayISO()
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}>
                  Today
                </button>
                <button onClick={() => setDate(yesterdayISO())}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    date === yesterdayISO()
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}>
                  Yesterday
                </button>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "TOTAL PATIENTS", value: stats.total,    valueClass: "text-gray-900 dark:text-white" },
                { label: "COMPLETED",      value: stats.done,     valueClass: "text-emerald-600 dark:text-emerald-400" },
                { label: "NEW PATIENTS",   value: stats.newPat,   valueClass: "text-blue-600 dark:text-blue-400" },
                { label: "FOLLOW-UPS",     value: stats.followup, valueClass: "text-purple-600 dark:text-purple-400" },
              ].map(c => (
                <div key={c.label} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 tracking-wider">{c.label}</p>
                  <p className={`text-3xl font-bold mt-1.5 ${c.valueClass}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">All Patients</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Click any row to see full patient details</p>
                </div>
                <span className="text-sm text-gray-400 dark:text-gray-600">{filtered.length} records</span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <p className="text-sm">Loading records…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {search ? "No patients match your search." : "No patients visited on this date."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-white/5">
                        {["#", "PATIENT", "AGE / SEX", "PHONE", "TYPE", "DEPARTMENT", "DOCTOR", "STATUS", "TIME IN"].map(h => (
                          <th key={h} className="text-left text-[10px] font-semibold text-gray-400 dark:text-gray-600 tracking-wider px-5 py-3.5 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(e => {
                        const p = e.patient;
                        return (
                          <tr key={e._id}
                            onClick={() => setSelected(e)}
                            className="border-b border-gray-50 dark:border-white/5 hover:bg-blue-50/40 dark:hover:bg-white/5 cursor-pointer transition-colors">
                            <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-500 tabular-nums w-12">
                              {e.queueNumber}
                            </td>
                            <td className="px-5 py-3.5 min-w-[160px]">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                {p?.name || "—"}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-600 font-mono mt-0.5">
                                {p?.permanentCode || "—"}
                              </p>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {p?.age ?? "—"} / {p?.gender?.charAt(0) || "?"}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 tabular-nums whitespace-nowrap">
                              {p?.phone || "—"}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                                p?.appointmentType === "New"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                  : p?.appointmentType === "Follow-up"
                                    ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                              }`}>
                                {p?.appointmentType || "OPD"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {e.department || "General"}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {e.doctor?.name || p?.doctorAssigned || "—"}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                                e.status === "done"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : e.status === "in-consultation"
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              }`}>
                                {e.status === "done" ? "Done" : e.status === "in-consultation" ? "In Room" : "Waiting"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-500 tabular-nums whitespace-nowrap">
                              {fmtTime(e.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <DetailPanel key={selected._id} entry={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientHistoryPage;
