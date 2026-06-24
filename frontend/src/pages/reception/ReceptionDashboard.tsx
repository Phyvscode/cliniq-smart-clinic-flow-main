import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, RefreshCw, X, Check,
  Users, Clock, KeyRound,
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { apiUpdateQueueStatus } from "@/lib/api";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import ChangePinModal from "@/components/ChangePinModal";

// ── Main Component ────────────────────────────────────────────────────────────
const ReceptionDashboard = () => {
  const { queue, patients, refreshQueue, refreshPatients, removeFromQueue } = useClinic();
  const [search,          setSearch]          = useState("");
  const [showChangePin,   setShowChangePin]   = useState(false);
  const [markingDone,     setMarkingDone]     = useState<string | null>(null);
  const [removing,        setRemoving]        = useState<string | null>(null);

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
          <button onClick={() => { refreshQueue(); refreshPatients(); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowChangePin(true)} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Change PIN">
            <KeyRound className="w-4 h-4" />
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
      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default ReceptionDashboard;
