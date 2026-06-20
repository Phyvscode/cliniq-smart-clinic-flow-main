import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, X, Check, KeyRound, ChevronLeft, ChevronRight,
  FlaskConical, Banknote, Smartphone, CreditCard, CheckCircle2, IndianRupee,
} from "lucide-react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import ChangePinModal from "@/components/ChangePinModal";
import { apiGetLabOrders, apiCollectLabFee } from "@/lib/api";

const PRICES: Record<string, number> = {
  "CBC": 300, "Blood Sugar Fasting": 80, "HbA1c": 400,
  "Lipid Profile": 500, "LFT": 600, "KFT": 500,
  "Thyroid Profile": 700, "Urine Routine": 100, "X-Ray Chest": 300,
  "ECG": 200, "USG Abdomen": 800, "CT Scan": 3000,
  "Dengue Test": 600, "Malaria Test": 150, "Vitamin D": 900, "Vitamin B12": 700,
};

const STATUS_COLOR: Record<string, string> = {
  ordered:          "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  sample_collected: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
  processing:       "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400",
  report_ready:     "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const STATUS_LABEL: Record<string, string> = {
  ordered: "Ordered", sample_collected: "Sample Collected",
  processing: "Processing", report_ready: "Report Ready",
};

const PAY_METHODS = [
  { key: "cash", label: "Cash",  icon: Banknote   },
  { key: "upi",  label: "UPI",   icon: Smartphone },
  { key: "card", label: "Card",  icon: CreditCard },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

const fmtTime = (d: string) => {
  try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }); }
  catch { return "—"; }
};

const DetailPanel = ({
  order, onClose, onFeeCollected,
}: {
  order: any;
  onClose: () => void;
  onFeeCollected: (id: string, payMethod: string) => Promise<void>;
}) => {
  const [payMethod, setPayMethod]   = useState("cash");
  const [collecting, setCollecting] = useState(false);
  const [error,      setError]      = useState("");

  const tests: string[] = order.tests || [];
  const total = tests.reduce((s: number, t: string) => s + (PRICES[t] ?? 0), 0);

  const handleCollect = async () => {
    setCollecting(true); setError("");
    try { await onFeeCollected(order._id, payMethod); }
    catch (e: any) { setError(e.message || "Collection failed"); }
    finally { setCollecting(false); }
  };

  return (
    <div className="w-[360px] shrink-0 bg-white dark:bg-[#0d0d1a] border-l border-gray-100 dark:border-white/5 flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${STATUS_COLOR[order.status] || STATUS_COLOR.ordered}`}>
            {STATUS_LABEL[order.status] || order.status}
          </span>
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
        {/* Patient info */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">PATIENT INFO</p>
          <div className="space-y-1.5 text-sm">
            {[
              ["UHID",   order.patient?.permanentCode || "—"],
              ["Age",    order.patient?.age || "—"],
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

        {/* Tests + prices */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">TESTS & FEES</p>
          <div className="space-y-1.5">
            {tests.map((test, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-3.5 h-3.5 text-gray-400 shrink-0" strokeWidth={1.5} />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{test}</span>
                </div>
                <div className="flex items-center gap-0.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <IndianRupee className="w-3 h-3" />
                  {PRICES[test] ?? "—"}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
            <span className="text-2xl font-serif text-gray-900 dark:text-white">₹{total}</span>
          </div>
        </div>

        {/* Payment */}
        {!order.feeCollected ? (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">PAYMENT METHOD</p>
            <div className="flex flex-col gap-2 mb-4">
              {PAY_METHODS.map(m => (
                <button key={m.key} onClick={() => setPayMethod(m.key)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    payMethod === m.key
                      ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                  }`}>
                  <m.icon className="w-4 h-4" /> {m.label}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <button onClick={handleCollect} disabled={collecting}
              className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40">
              {collecting
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                : <>Collect ₹{total}</>}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Fee collected · {order.paymentMethod || "cash"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ReceptionTests = () => {
  const [date,          setDate]          = useState(todayStr());
  const [orders,        setOrders]        = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState<any>(null);
  const [showChangePin, setShowChangePin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGetLabOrders({ date });
      setOrders(r.orders || []);
    } catch {} finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);
  useEffect(() => { setSelected(null); }, [date]);

  const shiftDate = (delta: number) => {
    const d = new Date(date); d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const isToday = date === todayStr();

  const handleFeeCollected = async (id: string, payMethod: string) => {
    await apiCollectLabFee(id, payMethod);
    const updated = orders.map(o => o._id === id ? { ...o, feeCollected: true, paymentMethod: payMethod } : o);
    setOrders(updated);
    if (selected?._id === id) setSelected((p: any) => ({ ...p, feeCollected: true, paymentMethod: payMethod }));
  };

  const pending   = orders.filter(o => !o.feeCollected).length;
  const collected = orders.filter(o => o.feeCollected).length;
  const revenue   = orders.filter(o => o.feeCollected)
    .reduce((s, o) => s + (o.tests || []).reduce((ts: number, t: string) => ts + (PRICES[t] ?? 0), 0), 0);

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="tests" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
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
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <KeyRound className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">LAB TEST BILLING</p>
              <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-2">
                Collect{" "}
                <em className="text-gray-400 dark:text-gray-600 italic font-serif">test fees</em>{" "}
                from patients.
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {fmtDate(date)}{isToday && " · Today"}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "PENDING FEES",    value: pending,            sub: "awaiting collection" },
                  { label: "FEES COLLECTED",  value: collected,          sub: "completed"           },
                  { label: "REVENUE TODAY",   value: `₹${revenue}`,     sub: "from lab tests"      },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">{s.label}</p>
                    <p className="text-4xl font-serif text-gray-900 dark:text-white mb-1">{s.value}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Orders list */}
              <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
                  <h2 className="text-2xl font-serif text-gray-900 dark:text-white">Lab Orders</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-600">{orders.length} total</span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-16 text-center">
                    <FlaskConical className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" strokeWidth={1.5} />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No lab orders for this date.</p>
                  </div>
                ) : orders.map((order, i) => {
                  const isSelected = selected?._id === order._id;
                  const tests: string[] = order.tests || [];
                  const total = tests.reduce((s, t) => s + (PRICES[t] ?? 0), 0);

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
                            {order.patient?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-600">
                            Dr. {order.doctor?.name || "—"} · {tests.length} test{tests.length !== 1 ? "s" : ""} · ₹{total}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 truncate">
                            {tests.slice(0, 3).join(", ")}{tests.length > 3 && ` +${tests.length - 3} more`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${
                            order.feeCollected
                              ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          }`}>
                            {order.feeCollected ? "Paid" : "Unpaid"}
                          </span>
                          <span className={`text-[10px] px-2 py-1 rounded-lg ${STATUS_COLOR[order.status] || ""}`}>
                            {STATUS_LABEL[order.status] || order.status}
                          </span>
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
                  onFeeCollected={handleFeeCollected}
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

export default ReceptionTests;
