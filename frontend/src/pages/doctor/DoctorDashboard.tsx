import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, RefreshCw, KeyRound } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import ChangePinModal from "@/components/ChangePinModal";

const fmt = (d: string) => {
  const date = new Date(d);
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { queue, patients, refreshQueue, refreshPatients } = useClinic();
  const [search,         setSearch]        = useState("");
  const [showChangePin,  setShowChangePin] = useState(false);

  const [storedUserRaw, setStoredUserRaw] = useState(localStorage.getItem("cliniq_user"));
  const parsedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const doctorName = parsedUser?.name || "Doctor";
  const doctorSpec = parsedUser?.specialization || parsedUser?.department || "";

  useEffect(() => {
    refreshQueue();
    refreshPatients();
    const interval = setInterval(() => { refreshQueue(); refreshPatients(); }, 5000);

    // Hydrate specialization for sessions created before the backend fix
    const token = localStorage.getItem("cliniq_token");
    if (token && !parsedUser?.specialization) {
      fetch(`${(import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api"}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => {
          if (d.user?.specialization) {
            const updated = { ...parsedUser, ...d.user };
            localStorage.setItem("cliniq_user", JSON.stringify(updated));
            setStoredUserRaw(JSON.stringify(updated));
          }
        })
        .catch(() => {});
    }

    return () => clearInterval(interval);
  }, []);

  const queueRows = queue
    .map(q => {
      const patient = q._patient || patients.find(p => p.id === q.patientId) || null;
      return { queueEntry: q, patient };
    })
    .filter(item => item.patient !== null)
    .filter(item => !search || item.patient!.name.toLowerCase().includes(search.toLowerCase()));

  const doneCount    = queueRows.filter(r => r.queueEntry.status === "done").length;
  const pendingCount = queueRows.filter(r => r.queueEntry.status !== "done").length;

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <DoctorSidebar active="appointments" />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top search bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-200 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patients, doctors, actions..."
              className="w-full h-9 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-4 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-gray-400 dark:focus:border-white/20 transition-colors"
            />
          </div>
          <button onClick={() => { refreshQueue(); refreshPatients(); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowChangePin(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            title="Change PIN">
            <KeyRound className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Heading area */}
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">
              TODAY · {queueRows.length} APPOINTMENTS
            </p>
            <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-2">
              The day is{" "}
              <em className="text-gray-400 dark:text-gray-600 italic font-serif">moving</em>
              {" "}on schedule.
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Showing patients assigned to <span className="font-medium text-gray-700 dark:text-gray-300">Dr. {doctorName}</span>
              {doctorSpec && <> · {doctorSpec}</>}.
            </p>

            {/* Appointment table */}
            {queueRows.length === 0 ? (
              <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 p-16 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {search ? "No patients match your search." : "No patients in queue right now."}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                {queueRows.map((row, i) => {
                  const isDone     = row.queueEntry.status === "done";
                  const isInRoom   = row.queueEntry.status === "in-consultation";
                  const timeStr    = row.queueEntry.addedAt ? fmt(row.queueEntry.addedAt) : "—";
                  const p          = row.patient!;
                  const ageGender  = `${p.age || "?"}${(p as any).gender?.charAt(0) || ""}`;

                  return (
                    <motion.div
                      key={row.queueEntry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-4 px-6 py-4 ${i > 0 ? "border-t border-gray-100 dark:border-white/5" : ""}`}
                    >
                      {/* Time */}
                      <div className="w-14 shrink-0">
                        <span className={`text-sm tabular-nums ${isDone ? "text-gray-300 dark:text-gray-700" : "text-gray-700 dark:text-gray-300 font-medium"}`}>
                          {timeStr}
                        </span>
                      </div>

                      {/* Patient info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isDone ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>
                          {p.name}
                          <span className="font-normal text-gray-400 dark:text-gray-600"> · {ageGender}</span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-600 truncate">
                          Dr. {doctorName}{doctorSpec && ` · ${doctorSpec}`}
                        </p>
                      </div>

                      {/* Token */}
                      <div className="w-24 shrink-0">
                        <span className={`text-sm tabular-nums ${isDone ? "text-gray-300 dark:text-gray-700" : "text-gray-500 dark:text-gray-400"}`}>
                          Token #{row.queueEntry.queueNumber || "—"}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div className="w-24 shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600">
                            Done
                          </span>
                        ) : isInRoom ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            In room
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            Waiting
                          </span>
                        )}
                      </div>

                      {/* Action */}
                      <div className="w-32 shrink-0 flex justify-end gap-2">
                        {isDone ? (
                          <span className="text-sm text-gray-300 dark:text-gray-700 font-medium">Completed</span>
                        ) : (
                          <>
                            <button
                              onClick={() => navigate(`/doctor/consultation?patientId=${p.id}`)}
                              className="px-4 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                            >
                              Start →
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {doneCount > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-4 text-center">
                {doneCount} consultation{doneCount !== 1 ? "s" : ""} completed today
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default DoctorDashboard;
