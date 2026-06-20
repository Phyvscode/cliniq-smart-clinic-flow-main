import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, X, Check, AlertTriangle,
  LogOut, KeyRound, Archive, CheckCircle2, IndianRupee, Receipt,
  Banknote, Smartphone, CreditCard, Wallet,
  ShoppingCart, Plus, MinusCircle, PlusCircle, Trash2,
  Printer, Send, User, Pill, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChangePinModal from "@/components/ChangePinModal";
import {
  apiPharmacyQueue, apiPharmacyCollect, apiPharmacyMedicines,
  apiPharmacyAddMedicine, apiPharmacyDeleteMedicine, apiOtcCreate,
  apiPharmacyLookup, apiPharmacyLookupRx,
} from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAY_METHODS = [
  { key: "upi",    label: "UPI",         icon: Smartphone },
  { key: "cash",   label: "Cash",        icon: Banknote   },
  { key: "credit", label: "Credit Card", icon: CreditCard },
  { key: "debit",  label: "Debit Card",  icon: Wallet     },
];

const fmtDate = (d: string | Date) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    + ", " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const medFreq = (med: any): string => {
  if (med.frequencyInterval) return med.frequencyInterval;
  const m = med.morning   ? 1 : 0;
  const a = med.afternoon ? 1 : 0;
  const e = med.evening   ? 1 : 0;
  if (m + a + e === 0) return "As directed";
  return `${m}-${a}-${e}`;
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
const PharmacySidebar = ({ onLogout, onChangePin }: { onLogout: () => void; onChangePin: () => void }) => {
  const storedUser = localStorage.getItem("cliniq_user");
  const userName   = storedUser ? JSON.parse(storedUser).name : "Pharmacist";

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
        {[
          { icon: Pill,     label: "Pharmacy", active: true  },
        ].map(item => (
          <button key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              item.active
                ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium"
                : "text-gray-300 dark:text-gray-700 cursor-not-allowed"
            }`}
            disabled={!item.active}>
            <item.icon className="w-4 h-4 shrink-0" strokeWidth={item.active ? 2 : 1.5} />
            <span>{item.label}</span>
          </button>
        ))}
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
            <p className="text-[10px] text-gray-400 truncate">Pharmacy · Pharmacist</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({ rx, onClose, onCollect }: { rx: any; onClose: () => void; onCollect: () => void }) => {
  const [medStatus,  setMedStatus]  = useState<Record<string, "dispensed" | "unavailable">>({});
  const [payMethod,  setPayMethod]  = useState("upi");
  const [discount,   setDiscount]   = useState(0);
  const [collecting, setCollecting] = useState(false);

  const meds: any[] = rx.medicines || [];

  const total = meds.reduce((s: number, m: any) => {
    const price = m.medicine?.price ?? m.price ?? 0;
    const qty   = m.quantity ?? 1;
    return s + price * qty;
  }, 0);
  const finalAmt = Math.max(0, total - discount);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      await apiPharmacyCollect(rx._id, { paymentMethod: payMethod, discount, total: finalAmt });
      onCollect();
    } catch (e: any) { alert(e.message || "Failed"); }
    finally { setCollecting(false); }
  };

  const rxCode  = rx.rxCode  || `PRX-${String(rx._id || "").slice(-4).toUpperCase().padStart(4,"0")}`;
  const ptCode  = rx.patient?.permanentCode || `PT-${String(rx.patient?._id || rx.patientId || "").slice(-4).toUpperCase().padStart(4,"0")}`;
  const docName = rx.doctor?.name || rx.doctorName || "—";
  const dept    = rx.doctor?.specialization || rx.department || "General Medicine";
  const date    = rx.createdAt ? fmtDate(rx.createdAt) : "—";

  return (
    <div className="w-[380px] shrink-0 bg-white dark:bg-[#0d0d1a] border-l border-gray-100 dark:border-white/5 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600">
            {rxCode} · {ptCode}
          </p>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-3xl font-serif text-gray-900 dark:text-white mb-1">{rx.patient?.name || "Patient"}</h2>
        <p className="text-xs text-gray-400 dark:text-gray-600">Dr. {docName} · {dept} · {date}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Medicines */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">MEDICINES</p>
          <div className="space-y-3">
            {meds.length === 0 && (
              <p className="text-sm text-gray-400">No medicines prescribed.</p>
            )}
            {meds.map((med: any, i: number) => {
              const name     = med.medicine?.name || med.medicineName || "Unknown";
              const strength = med.dosageAmount ? `${med.dosageAmount}${med.dosageUnit || ""}` : "";
              const form     = med.medicine?.type || med.form || "Tablet";
              const generic  = med.medicine?.genericName || med.generic || "";
              const freq     = medFreq(med);
              const timing   = med.instructions || "";
              const days     = med.durationDays ? `${med.durationDays} Days` : "";
              const price    = med.medicine?.price ?? med.price ?? 0;
              const key      = `${rx._id}-${i}`;
              const status   = medStatus[key];

              return (
                <div key={i} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        <span className="font-bold">{name}</span>
                        {strength && <span className="font-normal text-gray-500 dark:text-gray-400"> {strength}</span>}
                        {form && <span className="font-normal text-gray-400 dark:text-gray-600"> · {form}</span>}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                        {[generic, freq, timing, days].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {price > 0 && (
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">₹{price}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setMedStatus(p => ({ ...p, [key]: p[key] === "dispensed" ? undefined as any : "dispensed" }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        status === "dispensed"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                      }`}>
                      <Check className="w-3 h-3" /> Dispensed
                    </button>
                    <button onClick={() => setMedStatus(p => ({ ...p, [key]: p[key] === "unavailable" ? undefined as any : "unavailable" }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        status === "unavailable"
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                      }`}>
                      <AlertTriangle className="w-3 h-3" /> Not Available
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment */}
        {!rx.collectedByPharmacy && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">PAYMENT</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PAY_METHODS.map(pm => (
                <button key={pm.key} onClick={() => setPayMethod(pm.key)}
                  className={`h-11 rounded-xl border font-medium text-sm transition-all ${
                    payMethod === pm.key
                      ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                  }`}>
                  {pm.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-gray-900 dark:text-white font-medium">₹{total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Discount</span>
                <input type="number" min={0} max={total} value={discount}
                  onChange={e => setDiscount(Math.min(total, Math.max(0, Number(e.target.value))))}
                  className="w-20 h-7 text-sm text-right bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-2 text-gray-700 dark:text-gray-300 focus:outline-none" />
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-gray-100 dark:border-white/5">
                <span className="text-gray-500 dark:text-gray-400">Final amount</span>
                <span className="text-gray-900 dark:text-white font-semibold">₹{finalAmt}</span>
              </div>
            </div>

            <button onClick={handleCollect} disabled={collecting}
              className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40">
              {collecting
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                : <>Complete Transaction <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {rx.collectedByPharmacy && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Dispensed · {rx.paymentMethod || "cash"} · {rx.collectedAt ? fmtDate(rx.collectedAt) : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Walk-in modal ─────────────────────────────────────────────────────────────
interface OtcItem { medicineId: string; medicineName: string; unitPrice: number; quantity: number; }

const WalkInModal = ({ medicines, onClose }: { medicines: any[]; onClose: () => void }) => {
  const [customerName,  setCustomerName]  = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart,          setCart]          = useState<OtcItem[]>([]);
  const [medSearch,     setMedSearch]     = useState("");
  const [showDrop,      setShowDrop]      = useState(false);
  const [discount,      setDiscount]      = useState(0);
  const [payMethod,     setPayMethod]     = useState("cash");
  const [submitting,    setSubmitting]    = useState(false);
  const [result,        setResult]        = useState<any>(null);
  const [error,         setError]         = useState("");

  const filtered = medicines.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase())).slice(0, 8);
  const subtotal  = cart.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const addToCart = (med: any) => {
    setCart(prev => {
      const ex = prev.find(it => it.medicineId === med._id);
      if (ex) return prev.map(it => it.medicineId === med._id ? { ...it, quantity: it.quantity + 1 } : it);
      return [...prev, { medicineId: med._id, medicineName: med.name, unitPrice: med.price || 0, quantity: 1 }];
    });
    setMedSearch(""); setShowDrop(false);
  };

  const handleSell = async () => {
    if (cart.length === 0) { setError("Add at least one medicine"); return; }
    setError(""); setSubmitting(true);
    try {
      const r = await apiOtcCreate({
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map(it => ({ ...it, total: it.unitPrice * it.quantity })),
        discount, paymentMethod: payMethod,
      });
      setResult(r);
      setCart([]); setCustomerName(""); setCustomerPhone(""); setDiscount(0);
    } catch (e: any) { setError(e.message || "Sale failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-serif text-gray-900 dark:text-white">Walk-in Sale</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {result && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{result.message}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1">Bill: {result.billNumber}</p>
              <button onClick={() => setResult(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">+ New sale</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-10 rounded-xl" />
            <Input placeholder="Phone (WhatsApp)" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Search medicines…" value={medSearch}
              onChange={e => { setMedSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)} className="pl-8 h-10 rounded-xl" />
            {showDrop && medSearch && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowDrop(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 max-h-44 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No medicines found</p>
                  ) : filtered.map(m => (
                    <button key={m._id} onClick={() => addToCart(m)}
                      className="w-full flex justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 text-left text-sm">
                      <span className="text-gray-900 dark:text-white">{m.name}</span>
                      <span className="text-gray-400 text-xs">{m.price ? `₹${m.price}` : "—"}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {cart.length > 0 && (
            <div className="space-y-2">
              {cart.map(it => (
                <div key={it.medicineId} className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2">
                  <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">{it.medicineName}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCart(p => p.map(x => x.medicineId === it.medicineId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}><MinusCircle className="w-4 h-4 text-gray-400" /></button>
                    <span className="w-5 text-center text-sm font-semibold">{it.quantity}</span>
                    <button onClick={() => setCart(p => p.map(x => x.medicineId === it.medicineId ? { ...x, quantity: x.quantity + 1 } : x))}><PlusCircle className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  <input type="number" value={it.unitPrice} onChange={e => setCart(p => p.map(x => x.medicineId === it.medicineId ? { ...x, unitPrice: Number(e.target.value) } : x))}
                    className="w-16 h-6 text-xs text-right bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 focus:outline-none" />
                  <button onClick={() => setCart(p => p.filter(x => x.medicineId !== it.medicineId))} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="flex justify-between text-sm px-1">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{subtotal}</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-400">Discount</span>
                <input type="number" min={0} max={subtotal} value={discount} onChange={e => setDiscount(Math.min(subtotal, Number(e.target.value)))}
                  className="w-20 h-7 text-xs text-right bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-2 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[{ key:"cash", label:"Cash" }, { key:"upi", label:"UPI" }].map(m => (
                  <button key={m.key} onClick={() => setPayMethod(m.key)}
                    className={`h-9 rounded-xl border text-sm font-medium transition-all ${payMethod === m.key ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={handleSell} disabled={submitting || cart.length === 0}
            className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40">
            {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : `Collect ₹${grandTotal}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Medicines Modal ───────────────────────────────────────────────────────────
const MedicinesModal = ({ medicines, onClose, onRefresh }: { medicines: any[]; onClose: () => void; onRefresh: () => void }) => {
  const [search,    setSearch]    = useState("");
  const [showAdd,   setShowAdd]   = useState(false);
  const [newMed,    setNewMed]    = useState({ name: "", category: "", manufacturer: "", unit: "" });
  const [adding,    setAdding]    = useState(false);
  const [error,     setError]     = useState("");

  const filtered = medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!newMed.name.trim()) { setError("Name is required"); return; }
    setAdding(true); setError("");
    try {
      await apiPharmacyAddMedicine(newMed);
      setNewMed({ name: "", category: "", manufacturer: "", unit: "" });
      setShowAdd(false); onRefresh();
    } catch (e: any) { setError(e.message || "Failed"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this medicine?")) return;
    await apiPharmacyDeleteMedicine(id); onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-serif text-gray-900 dark:text-white">Medicines ({medicines.length})</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(s => !s)} className="h-8 px-3 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-3">
          {showAdd && (
            <div className="space-y-2 bg-gray-50 dark:bg-white/5 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name *" value={newMed.name} onChange={e => setNewMed(p => ({...p, name: e.target.value}))} className="h-9 rounded-xl" />
                <Input placeholder="Category" value={newMed.category} onChange={e => setNewMed(p => ({...p, category: e.target.value}))} className="h-9 rounded-xl" />
                <Input placeholder="Manufacturer" value={newMed.manufacturer} onChange={e => setNewMed(p => ({...p, manufacturer: e.target.value}))} className="h-9 rounded-xl" />
                <Input placeholder="Unit (tab/ml…)" value={newMed.unit} onChange={e => setNewMed(p => ({...p, unit: e.target.value}))} className="h-9 rounded-xl" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={handleAdd} disabled={adding}
                className="w-full h-9 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40">
                {adding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Add Medicine
              </button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 rounded-xl" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No medicines found</p>
            ) : filtered.map(m => (
              <div key={m._id} className="flex items-center gap-3 py-2.5">
                <Pill className="w-4 h-4 text-gray-300 dark:text-gray-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                  <p className="text-xs text-gray-400">{[m.category, m.manufacturer, m.unit].filter(Boolean).join(" · ")}</p>
                </div>
                <button onClick={() => handleDelete(m._id)} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const [queue,        setQueue]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<any>(null);
  const [search,       setSearch]       = useState("");
  const [medicines,    setMedicines]    = useState<any[]>([]);
  const [showWalkin,   setShowWalkin]   = useState(false);
  const [showMeds,     setShowMeds]     = useState(false);
  const [showChangePin,setShowChangePin]= useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try { const r = await apiPharmacyQueue(); setQueue(r.prescriptions || []); }
    catch {} finally { setLoading(false); }
  }, []);

  const loadMedicines = useCallback(async () => {
    try { const r = await apiPharmacyMedicines(); setMedicines(r.medicines || []); }
    catch {}
  }, []);

  useEffect(() => {
    loadQueue(); loadMedicines();
    const id = setInterval(loadQueue, 10000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
    navigate("/");
  };

  const pendingCount   = queue.filter(rx => !rx.collectedByPharmacy).length;
  const completedCount = queue.filter(rx => rx.collectedByPharmacy).length;
  const revenueToday   = queue.filter(rx => rx.collectedByPharmacy).reduce((s, rx) => s + (rx.totalAmount || 0), 0);

  const displayQueue = queue.filter(rx =>
    !search || (rx.patient?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const fmtTime = (d: string) => {
    try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }); }
    catch { return "—"; }
  };

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <PharmacySidebar onLogout={handleLogout} onChangePin={() => setShowChangePin(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients, prescriptions..."
              className="w-full h-9 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-10 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none transition-colors" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 dark:text-gray-700 border border-gray-200 dark:border-gray-700 rounded px-1">⌘K</span>
          </div>
          <ThemeToggle />
          <button onClick={() => setShowWalkin(true)}
            className="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 flex items-center gap-1.5 transition-colors">
            <ShoppingCart className="w-3.5 h-3.5" /> Walk-in
          </button>
          <button onClick={() => setShowMeds(true)}
            className="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 flex items-center gap-1.5 transition-colors">
            <Pill className="w-3.5 h-3.5" /> Medicines
          </button>
          <button onClick={loadQueue}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowChangePin(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <KeyRound className="w-4 h-4" />
          </button>
        </div>

        {/* Content row */}
        <div className="flex-1 flex min-h-0">
          {/* Left scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Heading */}
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">IN-HOUSE PHARMACY</p>
              <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-2">
                Dispense &amp;{" "}
                <em className="text-gray-400 dark:text-gray-600 italic font-serif">bill</em>
                {" "}from the doctor's desk.
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                Prescriptions arrive here the moment a doctor finalizes a consultation.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: "PENDING PRESCRIPTIONS", value: pendingCount,   sub: "awaiting dispense",   icon: Archive      },
                  { label: "COMPLETED TODAY",        value: completedCount, sub: `${completedCount} total`, icon: CheckCircle2 },
                  { label: "REVENUE TODAY",          value: `₹${revenueToday}`, sub: "collected",      icon: IndianRupee  },
                  { label: "TICKETS",                value: queue.length,   sub: "prescriptions today", icon: Receipt      },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 leading-tight">{s.label}</p>
                      <s.icon className="w-4 h-4 text-gray-300 dark:text-gray-700 shrink-0" strokeWidth={1.5} />
                    </div>
                    <p className="text-4xl font-serif text-gray-900 dark:text-white mb-1">{s.value}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Queue */}
              <div className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
                  <h2 className="text-2xl font-serif text-gray-900 dark:text-white">Queue</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-600">{displayQueue.length} total</span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : displayQueue.length === 0 ? (
                  <div className="py-16 text-center">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" strokeWidth={1.5} />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {search ? "No prescriptions match your search." : "No prescriptions yet today."}
                    </p>
                  </div>
                ) : (
                  <div>
                    {displayQueue.map((rx, i) => {
                      const isSelected = selected?._id === rx._id;
                      const isPending  = !rx.collectedByPharmacy;
                      const medCount   = rx.medicines?.length || 0;
                      const treatments = rx.treatments?.length || 0;
                      const docName    = rx.doctor?.name || rx.doctorName || "—";
                      const dept       = rx.doctor?.specialization || rx.department || "General Medicine";
                      const rxCode     = rx.rxCode || `PRX-${String(rx._id || "").slice(-4).toUpperCase().padStart(4,"0")}`;
                      const ptCode     = rx.patient?.permanentCode || `PT-${String(rx.patient?._id || rx.patientId || "").slice(-4).toUpperCase().padStart(4,"0")}`;

                      return (
                        <motion.button key={rx._id} onClick={() => setSelected(isSelected ? null : rx)}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                          className={`w-full text-left px-6 py-4 transition-all ${i > 0 ? "border-t border-gray-100 dark:border-white/5" : ""} ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-500/5 border-l-2 border-l-blue-400 dark:border-l-blue-500"
                              : "hover:bg-gray-50 dark:hover:bg-white/5"
                          }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                                {rx.patient?.name || "Unknown"}
                                {rx.patient?.age && <span className="font-normal text-gray-400 dark:text-gray-600"> · {rx.patient.age}M</span>}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-600">
                                {rxCode} · {ptCode} · Dr. {docName} ({dept})
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                                {rx.createdAt ? fmtTime(rx.createdAt) : "—"}
                                {medCount > 0 && ` · ${medCount} med${medCount > 1 ? "s" : ""}`}
                                {treatments > 0 && ` · ${treatments} treatment${treatments > 1 ? "s" : ""}`}
                              </p>
                            </div>
                            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg ${
                              isPending
                                ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-500"
                            }`}>
                              {isPending ? "Pending" : "Completed"}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right detail panel */}
          <AnimatePresence>
            {selected && (
              <motion.div key={selected._id}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.25 }}
                className="shrink-0 h-full">
                <DetailPanel rx={selected} onClose={() => setSelected(null)} onCollect={() => { loadQueue(); setSelected(null); }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showWalkin && <WalkInModal medicines={medicines} onClose={() => setShowWalkin(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showMeds && <MedicinesModal medicines={medicines} onClose={() => setShowMeds(false)} onRefresh={loadMedicines} />}
      </AnimatePresence>
      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default PharmacyDashboard;
