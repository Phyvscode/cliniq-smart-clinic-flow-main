import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Bell, RefreshCw } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

const fmt = (d: string) => {
  try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }); }
  catch { return "—"; }
};

const ReceptionAppointments = () => {
  const navigate = useNavigate();
  const { queue, patients, refreshQueue, refreshPatients } = useClinic();
  const [search, setSearch] = useState("");

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

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="appointments" />

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
          <ThemeToggle />
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">
              TODAY · {rows.length} APPOINTMENTS
            </p>
            <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-1.5">
              The day is{" "}
              <em className="text-gray-400 dark:text-gray-600 italic font-serif">moving</em>
              {" "}on schedule.
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Live queue across all departments.</p>

            {rows.length === 0 ? (
              <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 p-16 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {search ? "No patients match your search." : "No appointments today."}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                {rows.map((row, i) => {
                  const isDone   = row.entry.status === "done";
                  const isInRoom = row.entry.status === "in-consultation";
                  const p        = row.patient!;
                  const timeStr  = row.entry.addedAt ? fmt(row.entry.addedAt) : "—";
                  const docName  = row.doctor?.name || (row.entry as any).doctorName || "";
                  const dept     = (row.entry as any).department || (row.doctor as any)?.specialization || "General Medicine";

                  return (
                    <motion.div key={row.entry.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-4 px-6 py-4 ${i > 0 ? "border-t border-gray-100 dark:border-white/5" : ""}`}>
                      {/* Time */}
                      <div className="w-14 shrink-0">
                        <span className={`text-sm tabular-nums font-semibold ${isDone ? "text-gray-300 dark:text-gray-700" : "text-gray-700 dark:text-gray-300"}`}>
                          {timeStr}
                        </span>
                      </div>

                      {/* Patient + doctor */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isDone ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>
                          {p.name}
                          <span className="font-normal text-gray-400 dark:text-gray-600"> · {(p as any).gender?.charAt(0) || "?"}</span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-600 truncate">
                          {docName ? `Dr. ${docName} · ` : ""}{dept}
                          {(row.entry as any).referredBy ? ` · Referred by Dr. ${(row.entry as any).referredBy}` : ""}
                        </p>
                      </div>

                      {/* Token */}
                      <div className="w-28 shrink-0">
                        <span className={`text-sm tabular-nums ${isDone ? "text-gray-300 dark:text-gray-700" : "text-gray-500 dark:text-gray-400"}`}>
                          Token #{row.entry.queueNumber || "—"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="w-24 shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600">Done</span>
                        ) : isInRoom ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> In room
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Waiting
                          </span>
                        )}
                      </div>

                      {/* Action */}
                      <div className="w-28 shrink-0 text-right">
                        {isDone ? (
                          <span className="text-sm text-gray-300 dark:text-gray-700">Completed</span>
                        ) : (
                          <span className="text-gray-200 dark:text-gray-800">—</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionAppointments;
