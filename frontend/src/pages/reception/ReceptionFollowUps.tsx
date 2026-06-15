import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, RefreshCw, Phone, PhoneCall, PhoneMissed, CheckCheck, RotateCcw, X, Calendar } from "lucide-react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("cliniq_token");

const OUTCOME_BTNS = [
  { key: "called",        label: "Called",    icon: PhoneCall,  color: "emerald" },
  { key: "no_answer",     label: "No answer", icon: PhoneMissed,color: "red"     },
  { key: "confirmed",     label: "Confirmed", icon: CheckCheck, color: "blue"    },
  { key: "rescheduled",   label: "Reschedule",icon: RotateCcw,  color: "amber"   },
];

const ReceptionFollowUps = () => {
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [statuses,  setStatuses]  = useState<Record<string, string>>({});
  const [search,    setSearch]    = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/prescriptions/followups`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setFollowups(data.followups || []);
    } catch { setFollowups([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
    try {
      await fetch(`${BASE_URL}/prescriptions/followups/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const today    = new Date().toISOString().split("T")[0];
  const filtered = followups.filter(f =>
    !search || (f.patientName || f.patient?.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const overdue = filtered.filter(f => f.followUpDate && f.followUpDate.split("T")[0] < today);
  const todayF  = filtered.filter(f => f.followUpDate && f.followUpDate.split("T")[0] === today);
  const upcomingF = filtered.filter(f => f.followUpDate && f.followUpDate.split("T")[0] > today);

  const FollowUpCard = ({ f }: { f: any }) => {
    const status    = statuses[f._id] || f.followUpStatus || "";
    const name      = f.patientName || f.patient?.name || "Unknown";
    const phone     = f.patientPhone || f.patient?.phone || "—";
    const doctor    = f.doctorName || "—";
    const lastVisit = f.date ? new Date(f.date).toLocaleDateString("en-IN") : "—";
    const dueDate   = f.followUpDate ? f.followUpDate.split("T")[0] : "—";

    return (
      <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 flex items-center gap-4">
        {/* Phone icon */}
        <div className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
          <Phone className="w-4 h-4 text-gray-400 dark:text-gray-600" strokeWidth={1.5} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
          <p className="text-xs text-gray-400 truncate">{phone} · Dr. {doctor} · last visit {lastVisit}</p>
        </div>

        {/* Due date */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          Due {dueDate}
        </div>

        {/* Status badge */}
        {status && (
          <span className="shrink-0 text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
            {status === "called" ? "Called" : status === "no_answer" ? "No answer" : status === "confirmed" ? "Confirmed" : "Rescheduled"}
          </span>
        )}

        {/* Outcome buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {OUTCOME_BTNS.map(btn => (
            <button key={btn.key} onClick={() => updateStatus(f._id, btn.key)}
              className={`h-8 px-3 rounded-lg text-xs font-medium border transition-all ${
                status === btn.key
                  ? btn.color === "emerald" ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : btn.color === "red"     ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-500/10 dark:text-red-400"
                  : btn.color === "blue"    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
              }`}>
              {btn.label}
            </button>
          ))}
          <button onClick={() => setFollowups(prev => prev.filter(x => x._id !== f._id))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-gray-200 dark:border-gray-700 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const Section = ({ label, dot, items }: { label: string; dot: string; items: any[] }) => (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <p className="text-[11px] font-semibold tracking-widest text-gray-500 dark:text-gray-500">
          {label} · {items.length}
        </p>
      </div>
      {items.length === 0 ? (
        <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl py-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-600">Nothing here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(f => <FollowUpCard key={f._id} f={f} />)}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="followups" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients, doctors, actions..."
              className="w-full h-9 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-10 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 transition-colors" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 dark:text-gray-700 border border-gray-200 dark:border-gray-700 rounded px-1">⌘K</span>
          </div>
          <ThemeToggle />
          <button onClick={load} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">
            RECEPTION · PATIENT OUTREACH
          </p>
          <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-1.5">
            Follow-up{" "}
            <em className="text-gray-400 dark:text-gray-600 italic font-serif">dashboard</em>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Call patients, mark outcomes, and reschedule.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : followups.length === 0 ? (
            <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 py-16 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" strokeWidth={1.5} />
              <p className="text-sm text-gray-500 dark:text-gray-400">No follow-ups scheduled</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Follow-ups are created when doctors set a return date in prescriptions</p>
            </div>
          ) : (
            <>
              <Section label="OVERDUE" dot="bg-amber-500" items={overdue} />
              <Section label="TODAY"   dot="bg-gray-400 dark:bg-gray-600" items={todayF} />
              {upcomingF.length > 0 && <Section label="UPCOMING" dot="bg-blue-400" items={upcomingF} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionFollowUps;
