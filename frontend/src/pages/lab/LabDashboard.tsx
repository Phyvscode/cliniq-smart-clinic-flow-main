import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, X, LogOut, FlaskConical, KeyRound,
  CheckCircle2, Upload, ChevronLeft, ChevronRight, FileText,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChangePinModal from "@/components/ChangePinModal";
import {
  apiGetLabOrders, apiUpdateLabOrderStatus, apiUploadLabReport,
} from "@/lib/api";

type LabStatus = "ordered" | "sample_collected" | "processing" | "report_ready";

const STATUS_CONFIG: Record<LabStatus, { label: string; color: string }> = {
  ordered:          { label: "Ordered",          color: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"      },
  sample_collected: { label: "Sample Collected", color: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"          },
  processing:       { label: "Processing",       color: "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400"  },
  report_ready:     { label: "Report Ready",     color: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
};

const NEXT_STATUS: Record<string, LabStatus | null> = {
  ordered:          "sample_collected",
  sample_collected: "processing",
  processing:       "report_ready",
  report_ready:     null,
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const fmtTime = (d: string) => {
  try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }); }
  catch { return "—"; }
};

const LabSidebar = ({ onLogout, onChangePin }: { onLogout: () => void; onChangePin: () => void }) => {
  const storedUser = localStorage.getItem("cliniq_user");
  const userName   = storedUser ? JSON.parse(storedUser).name : "Lab Staff";

  return (
    <div className="w-[200px] shrink-0 bg-white dark:bg-[#0d0d1a] border-r border-gray-100 dark:border-white/5 flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100 dark:border-white/5">
        <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center shrink-0">
          <span className="text-white dark:text-gray-900 text-xs font-bold">C</span>
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-sm">ClinIQ</span>
        <span className="text-[10px] text-gray-400 font-light">os</span>
        <div className="ml-auto"><ThemeToggle /></div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium">
          <FlaskConical className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Laboratory</span>
        </button>
      </nav>

      <div className="px-3 pb-4 border-t border-gray-100 dark:border-white/5 pt-3 space-y-1">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5">
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-gray-600 dark:text-white/80">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white/80 truncate">{userName}</p>
            <p className="text-[10px] text-gray-400 truncate">Laboratory · Tech</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailPanel = ({
  order, onClose, onStatusUpdate, onReportUpload,
}: {
  order: any;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string) => Promise<void>;
  onReportUpload: (id: string, base64: string, fileName: string) => Promise<void>;
}) => {
  const [updating,   setUpdating]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const status    = order.status as LabStatus;
  const cfg       = STATUS_CONFIG[status] || STATUS_CONFIG.ordered;
  const nextStatus = NEXT_STATUS[status];

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try { await onStatusUpdate(order._id, nextStatus); }
    finally { setUpdating(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await onReportUpload(order._id, base64, file.name);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="w-[360px] shrink-0 bg-white dark:bg-[#0d0d1a] border-l border-gray-100 dark:border-white/5 flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${cfg.color}`}>{cfg.label}</span>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-3xl font-serif text-gray-900 dark:text-white mb-1">{order.patient?.name || "Patient"}</h2>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Dr. {order.doctor?.name || "—"} · {order.createdAt ? fmtTime(order.createdAt) : "—"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">TESTS ORDERED</p>
          <div className="space-y-1.5">
            {(order.tests || []).map((test: string, i: number) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                <FlaskConical className="w-3.5 h-3.5 text-gray-400 shrink-0" strokeWidth={1.5} />
                <span className="text-sm text-gray-800 dark:text-gray-200">{test}</span>
              </div>
            ))}
          </div>
        </div>

        {order.notes && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">DOCTOR'S NOTES</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-white/5">
              {order.notes}
            </p>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">PATIENT INFO</p>
          <div className="space-y-1.5 text-sm">
            {[
              ["UHID",   order.patient?.permanentCode || "—"],
              ["Age",    order.patient?.age ? `${order.patient.age}` : "—"],
              ["Gender", order.patient?.gender || "—"],
              ["Phone",  order.patient?.phone || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-600">{label}</span>
                <span className="text-gray-800 dark:text-gray-200 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">FEE STATUS</p>
          <div className={`px-3 py-2.5 rounded-xl text-sm font-medium ${
            order.feeCollected
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}>
            {order.feeCollected
              ? `Fee collected · ${order.paymentMethod || "cash"}`
              : "Fee pending — receptionist will collect"}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-3 border-t border-gray-100 dark:border-white/5 space-y-2.5">
        {nextStatus && (
          <button onClick={handleStatusUpdate} disabled={updating}
            className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40">
            {updating
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <>Mark as {STATUS_CONFIG[nextStatus]?.label}</>}
          </button>
        )}

        <div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} id="report-upload" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className={`w-full h-11 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${
              order.reportBase64
                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}>
            {uploading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading…</>
              : order.reportBase64
                ? <><FileText className="w-4 h-4" /> Replace Report</>
                : <><Upload className="w-4 h-4" /> Upload PDF Report</>}
          </button>
        </div>

        {order.reportBase64 && (
          <button onClick={() => {
            const blob = b64toBlob(order.reportBase64, "application/pdf");
            const url  = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }}
            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" /> View Uploaded Report
          </button>
        )}
      </div>
    </div>
  );
};

function b64toBlob(b64: string, type: string) {
  const byteChars = atob(b64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type });
}

const LabDashboard = () => {
  const navigate = useNavigate();
  const [orders,         setOrders]         = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selected,       setSelected]       = useState<any>(null);
  const [date,           setDate]           = useState(todayStr());
  const [statusFilter,   setStatusFilter]   = useState<string>("all");
  const [showChangePin,  setShowChangePin]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGetLabOrders({ date });
      setOrders(r.orders || []);
    } catch {} finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  useEffect(() => { setSelected(null); }, [date]);

  const handleLogout = () => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
    navigate("/");
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await apiUpdateLabOrderStatus(id, status);
    const updated = orders.map(o => o._id === id ? { ...o, status } : o);
    setOrders(updated);
    if (selected?._id === id) setSelected((prev: any) => ({ ...prev, status }));
  };

  const handleReportUpload = async (id: string, base64: string, fileName: string) => {
    await apiUploadLabReport(id, base64, fileName);
    const updated = orders.map(o => o._id === id
      ? { ...o, reportBase64: base64, reportFileName: fileName, status: "report_ready" }
      : o
    );
    setOrders(updated);
    if (selected?._id === id)
      setSelected((prev: any) => ({ ...prev, reportBase64: base64, reportFileName: fileName, status: "report_ready" }));
  };

  const shiftDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const isToday = date === todayStr();

  const displayOrders = statusFilter === "all"
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const counts = {
    all:              orders.length,
    ordered:          orders.filter(o => o.status === "ordered").length,
    sample_collected: orders.filter(o => o.status === "sample_collected").length,
    processing:       orders.filter(o => o.status === "processing").length,
    report_ready:     orders.filter(o => o.status === "report_ready").length,
  };

  const FILTERS = [
    { key: "all",              label: "All",              count: counts.all              },
    { key: "ordered",          label: "Ordered",          count: counts.ordered          },
    { key: "sample_collected", label: "Sample Collected", count: counts.sample_collected },
    { key: "processing",       label: "Processing",       count: counts.processing       },
    { key: "report_ready",     label: "Report Ready",     count: counts.report_ready     },
  ];

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <LabSidebar onLogout={handleLogout} onChangePin={() => setShowChangePin(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input type="date" value={date} max={todayStr()}
              onChange={e => e.target.value && setDate(e.target.value)}
              className="h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none" />
            <button onClick={() => shiftDate(1)} disabled={isToday}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1" />
          <button onClick={load}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowChangePin(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <KeyRound className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">LABORATORY</p>
              <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-2">
                Test orders &{" "}
                <em className="text-gray-400 dark:text-gray-600 italic font-serif">reports</em>.
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {fmtDate(date)} {isToday && "· Today"}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8 mt-6">
                {[
                  { label: "TOTAL ORDERS",   value: counts.all,          sub: "for this date"    },
                  { label: "PENDING",         value: counts.ordered,      sub: "awaiting sample"  },
                  { label: "IN PROGRESS",     value: counts.processing + counts.sample_collected, sub: "being processed" },
                  { label: "REPORTS READY",   value: counts.report_ready, sub: "completed"        },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">{s.label}</p>
                    <p className="text-4xl font-serif text-gray-900 dark:text-white mb-1">{s.value}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {FILTERS.map(f => (
                  <button key={f.key} onClick={() => setStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      statusFilter === f.key
                        ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                    }`}>
                    {f.label}
                    <span className="ml-1.5 opacity-60">{f.count}</span>
                  </button>
                ))}
              </div>

              {/* Orders list */}
              <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : displayOrders.length === 0 ? (
                  <div className="py-16 text-center">
                    <FlaskConical className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" strokeWidth={1.5} />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No lab orders for this date.</p>
                  </div>
                ) : displayOrders.map((order, i) => {
                  const isSelected = selected?._id === order._id;
                  const cfg = STATUS_CONFIG[order.status as LabStatus] || STATUS_CONFIG.ordered;
                  return (
                    <motion.button key={order._id} onClick={() => setSelected(isSelected ? null : order)}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className={`w-full text-left px-6 py-4 transition-all ${i > 0 ? "border-t border-gray-100 dark:border-white/5" : ""} ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-500/5 border-l-2 border-l-blue-400 dark:border-l-blue-500"
                          : "hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                            {order.patient?.name || "Unknown Patient"}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-600">
                            Dr. {order.doctor?.name || "—"} · {order.tests?.length || 0} test{order.tests?.length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 truncate">
                            {(order.tests || []).slice(0, 3).join(", ")}
                            {order.tests?.length > 3 && ` +${order.tests.length - 3} more`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${cfg.color}`}>{cfg.label}</span>
                          {order.reportBase64 && (
                            <span className="text-[10px] text-emerald-500 font-medium">Report uploaded</span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {selected && (
              <motion.div key={selected._id}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.25 }} className="shrink-0 h-full">
                <DetailPanel
                  order={selected}
                  onClose={() => setSelected(null)}
                  onStatusUpdate={handleStatusUpdate}
                  onReportUpload={handleReportUpload}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default LabDashboard;
