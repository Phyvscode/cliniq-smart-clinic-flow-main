import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill, Search, CheckCircle2, Clock, X, RefreshCw, Plus, Trash2,
  LogOut, KeyRound, Package, History, CreditCard, Banknote,
  Smartphone, ChevronDown, AlertCircle, Check, User,
  ShoppingCart, Printer, Send, IndianRupee, MinusCircle, PlusCircle,
} from "lucide-react";
import ChangePinModal from "@/components/ChangePinModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  apiPharmacyQueue, apiPharmacyLookup, apiPharmacyLookupRx,
  apiPharmacyCollect, apiPharmacyMedicines, apiPharmacyAddMedicine,
  apiPharmacyDeleteMedicine, apiOtcCreate,
} from "@/lib/api";

type Tab = "queue" | "lookup" | "medicines" | "walkin";

const PAYMENT_METHODS = [
  { key: "cash",      label: "Cash",      icon: Banknote },
  { key: "upi",       label: "UPI",       icon: Smartphone },
  { key: "card",      label: "Card",      icon: CreditCard },
  { key: "insurance", label: "Insurance", icon: CheckCircle2 },
];

const fmt = (d: string | Date) =>
  new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });

// ─── Medicine row display ─────────────────────────────────────────────────────
const MedRow = ({ med, i }: { med: any; i: number }) => {
  const slots = [
    med.morning && "Morning", med.afternoon && "Afternoon",
    med.evening && "Evening", med.night && "Night",
  ].filter(Boolean);
  const timing = med.frequencyInterval
    ? ({ "4h":"Every 4h","6h":"Every 6h","8h":"Every 8h","12h":"Every 12h" } as any)[med.frequencyInterval] || med.frequencyInterval
    : slots.join(", ") || "As directed";
  return (
    <div className={`flex items-start gap-3 py-2.5 ${i > 0 ? "border-t border-border/50" : ""}`}>
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">{i+1}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {med.medicine?.name || med.medicineName || "Unknown"}
          {med.dosageAmount && <span className="ml-1.5 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">{med.dosageAmount}{med.dosageUnit}</span>}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timing} · {med.durationDays} day{med.durationDays !== 1 ? "s":""}</p>
        {med.instructions && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{med.instructions}</p>}
      </div>
    </div>
  );
};

// ─── Prescription card ────────────────────────────────────────────────────────
const RxCard = ({ rx, onCollect }: { rx: any; onCollect: () => void }) => {
  const [expanded,  setExpanded]  = useState(false);
  const [method,    setMethod]    = useState("cash");
  const [collecting,setCollecting]= useState(false);

  const handleCollect = async () => {
    setCollecting(true);
    try { await apiPharmacyCollect(rx._id, { paymentMethod: method }); onCollect(); }
    catch (e: any) { alert(e.message || "Failed"); }
    finally { setCollecting(false); }
  };

  return (
    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
      className={`bg-card border rounded-2xl overflow-hidden ${rx.collectedByPharmacy ? "border-emerald-200 dark:border-emerald-800/50" : "border-border"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{rx.patient?.name}</p>
            {rx.patient?.permanentCode && (
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                ID: {rx.patient.permanentCode}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rx.patient?.age}y · {rx.patient?.gender} · Dr. {rx.doctor?.name} · {fmtDate(rx.createdAt)}
          </p>
          {rx.rxCode && <p className="text-[10px] font-mono text-primary mt-0.5">Rx: {rx.rxCode}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rx.collectedByPharmacy
            ? <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs">
                ✓ Dispensed {rx.collectedAt ? fmtDate(rx.collectedAt) : ""}
              </Badge>
            : <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Pending</Badge>
          }
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180":""}`} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height:0 }} animate={{ height:"auto" }} exit={{ height:0 }} className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4">
              {/* Diagnosis */}
              {rx.diagnosis && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl px-4 py-2.5">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">Diagnosis</p>
                  <p className="text-sm text-foreground">{rx.diagnosis}</p>
                </div>
              )}

              {/* Medicines */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Medicines ({rx.medicines?.length || 0})
                </p>
                <div className="bg-muted/30 rounded-xl px-3 divide-y divide-border/40">
                  {(rx.medicines || []).map((m: any, i: number) => (
                    <MedRow key={i} med={m} i={i} />
                  ))}
                </div>
              </div>

              {/* Collect section */}
              {!rx.collectedByPharmacy && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Method</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PAYMENT_METHODS.map(pm => (
                      <button key={pm.key} onClick={() => setMethod(pm.key)}
                        className={`py-2.5 rounded-xl border-2 text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                          method === pm.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>
                        <pm.icon className="w-3.5 h-3.5" />
                        {pm.label}
                      </button>
                    ))}
                  </div>
                  <Button className="w-full h-11 rounded-xl gap-2" onClick={handleCollect} disabled={collecting}>
                    {collecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Dispense Medicines & Collect Payment
                  </Button>
                </div>
              )}

              {rx.collectedByPharmacy && rx.collectedAt && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Dispensed on {fmt(rx.collectedAt)} · {rx.paymentMethod || "cash"}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Walk-in Sale Tab ─────────────────────────────────────────────────────────
interface OtcItem { medicineId: string; medicineName: string; unitPrice: number; quantity: number; }

const WalkInTab = ({ medicines }: { medicines: any[] }) => {
  const [customerName,  setCustomerName]  = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart,          setCart]          = useState<OtcItem[]>([]);
  const [medSearch,     setMedSearch]     = useState("");
  const [showMedDrop,   setShowMedDrop]   = useState(false);
  const [discount,      setDiscount]      = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting,    setSubmitting]    = useState(false);
  const [result,        setResult]        = useState<any>(null);
  const [error,         setError]         = useState("");

  const filteredMeds = medicines.filter(m =>
    m.name.toLowerCase().includes(medSearch.toLowerCase())
  ).slice(0, 8);

  const addToCart = (med: any) => {
    setCart(prev => {
      const existing = prev.find(it => it.medicineId === med._id);
      if (existing) return prev.map(it => it.medicineId === med._id ? { ...it, quantity: it.quantity + 1 } : it);
      return [...prev, { medicineId: med._id, medicineName: med.name, unitPrice: med.price || 0, quantity: 1 }];
    });
    setMedSearch(""); setShowMedDrop(false);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(it => it.medicineId === id
      ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  };

  const updatePrice = (id: string, price: number) => {
    setCart(prev => prev.map(it => it.medicineId === id ? { ...it, unitPrice: price } : it));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(it => it.medicineId !== id));

  const subtotal   = cart.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const printBill = (billText: string, billNum: string) => {
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html><head><title>Bill ${billNum}</title>
      <style>
        body { font-family: monospace; font-size: 13px; padding: 16px; max-width: 320px; margin: 0 auto; }
        pre  { white-space: pre-wrap; word-wrap: break-word; }
        h2   { text-align: center; }
        @media print { button { display: none; } }
      </style></head><body>
      <h2>ClinIQ Pharmacy</h2>
      <pre>${billText.replace(/\*/g, "").replace(/_/g, "")}</pre>
      <br/>
      <button onclick="window.print()">🖨️ Print</button>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const handleSell = async () => {
    if (cart.length === 0) { setError("Add at least one medicine to the cart"); return; }
    setError(""); setSubmitting(true);
    try {
      const r = await apiOtcCreate({
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map(it => ({ ...it, total: it.unitPrice * it.quantity })),
        discount,
        paymentMethod,
      });
      setResult(r);
      // Auto print if no phone or WhatsApp failed
      if (!customerPhone.trim() || r.billSentVia !== "whatsapp") {
        printBill(r.billText, r.billNumber);
      }
      setCart([]); setCustomerName(""); setCustomerPhone(""); setDiscount(0);
    } catch (e: any) { setError(e.message || "Sale failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Walk-in Sale</h2>
        <p className="text-sm text-muted-foreground">Sell medicines without a prescription</p>
      </div>

      {/* Success result */}
      {result && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">{result.message}</p>
          </div>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-mono">Bill: {result.billNumber}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5"
              onClick={() => printBill(result.billText, result.billNumber)}>
              <Printer className="w-3.5 h-3.5" /> Print Bill
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5"
              onClick={() => setResult(null)}>
              <Plus className="w-3.5 h-3.5" /> New Sale
            </Button>
          </div>
        </motion.div>
      )}

      {/* Customer details (optional) */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          Customer Details <span className="font-normal normal-case">(optional)</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Customer name" value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="pl-9 h-10 rounded-xl" />
          </div>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Phone (for WhatsApp bill)" value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="pl-9 h-10 rounded-xl" type="tel" maxLength={13} />
          </div>
        </div>
        {customerPhone && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Send className="w-3 h-3" /> Bill will be sent to this number via WhatsApp
          </p>
        )}
        {!customerPhone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Printer className="w-3 h-3" /> No phone — bill will open for printing
          </p>
        )}
      </div>

      {/* Medicine search + cart */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Medicines</h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search and add medicine..." value={medSearch}
            onChange={e => { setMedSearch(e.target.value); setShowMedDrop(true); }}
            onFocus={() => setShowMedDrop(true)}
            className="pl-9 h-11 rounded-xl" />
          {showMedDrop && medSearch && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMedDrop(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 overflow-hidden max-h-52 overflow-y-auto">
                {filteredMeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No medicines found</p>
                ) : filteredMeds.map(m => (
                  <button key={m._id} onClick={() => addToCart(m)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors text-left">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.type} {m.unit && `· ${m.unit}`}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0 ml-2">
                      {m.price ? `₹${m.price}` : "No price"}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cart items */}
        {cart.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Search and add medicines above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(it => (
              <div key={it.medicineId} className="flex items-center gap-3 bg-muted/30 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{it.medicineName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <IndianRupee className="w-3 h-3 text-muted-foreground shrink-0" />
                    <input
                      type="number" min="0" value={it.unitPrice}
                      onChange={e => updatePrice(it.medicineId, Number(e.target.value))}
                      className="w-20 h-6 text-xs border border-border rounded-lg px-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">per unit</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => updateQty(it.medicineId, -1)}
                    className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <MinusCircle className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-foreground">{it.quantity}</span>
                  <button onClick={() => updateQty(it.medicineId, 1)}
                    className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-right shrink-0 w-16">
                  <p className="text-sm font-bold text-foreground">{fmt(it.unitPrice * it.quantity)}</p>
                </div>
                <button onClick={() => removeItem(it.medicineId)}
                  className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bill summary */}
      {cart.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Bill Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({cart.length} item{cart.length > 1 ? "s" : ""})</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount (₹)</span>
              <input type="number" min="0" max={subtotal} value={discount}
                onChange={e => setDiscount(Math.min(subtotal, Number(e.target.value)))}
                className="w-24 h-7 text-sm border border-border rounded-lg px-2 bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex justify-between font-bold text-base border-t border-border pt-2">
              <span className="text-foreground">Grand Total</span>
              <span className="text-primary">{fmt(grandTotal)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { key:"cash",      label:"Cash",      icon:Banknote     },
              { key:"upi",       label:"UPI",       icon:Smartphone   },
              { key:"card",      label:"Card",      icon:CreditCard   },
              { key:"insurance", label:"Insurance", icon:CheckCircle2 },
            ].map(pm => (
              <button key={pm.key} onClick={() => setPaymentMethod(pm.key)}
                className={`py-2.5 rounded-xl border-2 text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === pm.key
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}>
                <pm.icon className="w-3.5 h-3.5" />
                {pm.label}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSell} disabled={submitting || cart.length === 0}
            className="w-full h-12 rounded-xl gap-2 text-base font-medium">
            {submitting ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
            ) : customerPhone ? (
              <><Send className="w-4 h-4" /> Collect {fmt(grandTotal)} & Send WhatsApp Bill</>
            ) : (
              <><Printer className="w-4 h-4" /> Collect {fmt(grandTotal)} & Print Bill</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const [tab,           setTab]           = useState<Tab>("queue");
  const [queue,         setQueue]         = useState<any[]>([]);
  const [queueLoading,  setQueueLoading]  = useState(true);
  const [lookupCode,    setLookupCode]    = useState("");
  const [lookupResult,  setLookupResult]  = useState<any>(null);
  const [lookupError,   setLookupError]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [medicines,     setMedicines]     = useState<any[]>([]);
  const [medSearch,     setMedSearch]     = useState("");
  const [newMed,        setNewMed]        = useState({ name:"", category:"", manufacturer:"", unit:"" });
  const [addingMed,     setAddingMed]     = useState(false);
  const [showAddMed,    setShowAddMed]    = useState(false);
  const [medError,      setMedError]      = useState("");
  const [showChangePin, setShowChangePin] = useState(false);

  const storedUser = localStorage.getItem("cliniq_user");
  const userName   = storedUser ? JSON.parse(storedUser).name : "Pharmacist";

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try { const r = await apiPharmacyQueue(); setQueue(r.prescriptions || []); }
    catch {} finally { setQueueLoading(false); }
  }, []);

  const loadMedicines = useCallback(async () => {
    try { const r = await apiPharmacyMedicines(); setMedicines(r.medicines || []); }
    catch {}
  }, []);

  useEffect(() => { loadQueue(); loadMedicines(); }, []);

  const handleLookup = async () => {
    const code = lookupCode.trim();
    if (!code) return;
    setLookupLoading(true); setLookupError(""); setLookupResult(null);
    try {
      // Try patient code (6 digits) or rxCode (11 digits)
      if (/^\d{6}$/.test(code)) {
        const r = await apiPharmacyLookup(code);
        setLookupResult({ type: "patient", ...r });
      } else if (/^\d{11}$/.test(code)) {
        const r = await apiPharmacyLookupRx(code);
        setLookupResult({ type: "rx", prescription: r.prescription });
      } else {
        setLookupError("Enter a 6-digit patient ID or 11-digit Rx code");
      }
    } catch (e: any) { setLookupError(e.message || "Not found"); }
    finally { setLookupLoading(false); }
  };

  const handleAddMedicine = async () => {
    if (!newMed.name.trim()) { setMedError("Medicine name is required"); return; }
    setAddingMed(true); setMedError("");
    try {
      await apiPharmacyAddMedicine(newMed);
      setNewMed({ name:"", category:"", manufacturer:"", unit:"" });
      setShowAddMed(false);
      await loadMedicines();
    } catch (e: any) { setMedError(e.message || "Failed to add"); }
    finally { setAddingMed(false); }
  };

  const handleDeleteMedicine = async (id: string) => {
    if (!confirm("Delete this medicine?")) return;
    await apiPharmacyDeleteMedicine(id);
    await loadMedicines();
  };

  const handleLogout = () => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
    navigate("/");
  };

  const pendingCount = queue.filter(rx => !rx.collectedByPharmacy).length;
  const filteredMeds = medicines.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Pill className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground">{userName}</h1>
          <p className="text-xs text-muted-foreground">Pharmacist · ClinIQ</p>
        </div>
        <button onClick={() => setShowChangePin(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted mr-1">
          <KeyRound className="w-3.5 h-3.5" /> Change PIN
        </button>
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </header>

      {/* Tab bar */}
      <div className="border-b border-border bg-card px-6">
        <div className="flex gap-0">
          {[
            { key:"queue",    label:"Today's Queue",    icon:Clock,        badge: pendingCount > 0 ? String(pendingCount) : undefined },
            { key:"lookup",   label:"Patient Lookup",   icon:Search       },
            { key:"walkin",   label:"Walk-in Sale",     icon:ShoppingCart },
            { key:"medicines",label:"Medicines",        icon:Package      },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as Tab)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all relative ${
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge && (
                <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <AnimatePresence mode="wait">

          {/* ── Walk-in Sale Tab ── */}
          {tab === "walkin" && (
            <motion.div key="walkin" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}>
              <WalkInTab medicines={medicines} />
            </motion.div>
          )}

          {/* ── Queue Tab ── */}
          {tab === "queue" && (
            <motion.div key="queue" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Today's Prescriptions</h2>
                  <p className="text-sm text-muted-foreground">Prescriptions created in the last 24 hours</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadQueue} className="rounded-xl gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>

              {queueLoading ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl"/>)}
                </div>
              ) : queue.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No pending prescriptions</p>
                  <p className="text-sm">All clear for now</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queue.map(rx => (
                    <RxCard key={rx._id} rx={rx} onCollect={loadQueue} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Lookup Tab ── */}
          {tab === "lookup" && (
            <motion.div key="lookup" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Patient Lookup</h2>
                <p className="text-sm text-muted-foreground">Enter 6-digit patient ID or 11-digit Rx code</p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="6-digit patient ID  or  20260506001 Rx code"
                    value={lookupCode}
                    onChange={e => setLookupCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLookup()}
                    className="pl-9 h-12 rounded-xl font-mono"
                    maxLength={11}
                  />
                </div>
                <Button onClick={handleLookup} disabled={lookupLoading} className="h-12 px-6 rounded-xl gap-2">
                  {lookupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </Button>
              </div>

              {lookupError && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {lookupError}
                </div>
              )}

              {/* Patient full history result */}
              {lookupResult?.type === "patient" && (
                <div className="space-y-4">
                  {/* Patient info */}
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-lg">{lookupResult.patient?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {lookupResult.patient?.age}y · {lookupResult.patient?.gender} · {lookupResult.patient?.phone}
                        </p>
                        <p className="text-xs font-mono text-primary mt-0.5">
                          Patient ID: {lookupResult.patient?.permanentCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prescription history */}
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-3">
                      Prescription History ({lookupResult.prescriptions?.length || 0})
                    </p>
                    {(!lookupResult.prescriptions || lookupResult.prescriptions.length === 0) ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No prescriptions found</p>
                    ) : (
                      <div className="space-y-3">
                        {lookupResult.prescriptions.map((rx: any) => (
                          <RxCard key={rx._id} rx={rx} onCollect={async () => {
                            const r = await apiPharmacyLookup(lookupCode.trim());
                            setLookupResult({ type:"patient", ...r });
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Single Rx lookup result */}
              {lookupResult?.type === "rx" && lookupResult.prescription && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">Prescription found</p>
                  <RxCard rx={lookupResult.prescription} onCollect={async () => {
                    const r = await apiPharmacyLookupRx(lookupCode.trim());
                    setLookupResult({ type:"rx", prescription: r.prescription });
                  }} />
                </div>
              )}
            </motion.div>
          )}

          {/* ── Medicines Tab ── */}
          {tab === "medicines" && (
            <motion.div key="medicines" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Medicines</h2>
                  <p className="text-sm text-muted-foreground">{medicines.length} medicines in database</p>
                </div>
                <Button size="sm" onClick={() => setShowAddMed(!showAddMed)} className="rounded-xl gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Medicine
                </Button>
              </div>

              <AnimatePresence>
                {showAddMed && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                    className="overflow-hidden">
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Add New Medicine</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Name *" value={newMed.name} onChange={e => setNewMed(p => ({...p, name:e.target.value}))} className="h-10 rounded-xl" />
                        <Input placeholder="Category" value={newMed.category} onChange={e => setNewMed(p => ({...p, category:e.target.value}))} className="h-10 rounded-xl" />
                        <Input placeholder="Manufacturer" value={newMed.manufacturer} onChange={e => setNewMed(p => ({...p, manufacturer:e.target.value}))} className="h-10 rounded-xl" />
                        <Input placeholder="Unit (tab, ml, mg...)" value={newMed.unit} onChange={e => setNewMed(p => ({...p, unit:e.target.value}))} className="h-10 rounded-xl" />
                      </div>
                      {medError && <p className="text-xs text-destructive">{medError}</p>}
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowAddMed(false)} className="flex-1 h-9 rounded-xl">Cancel</Button>
                        <Button onClick={handleAddMedicine} disabled={addingMed} className="flex-1 h-9 rounded-xl gap-1.5">
                          {addingMed ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Add
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search medicines..." value={medSearch} onChange={e => setMedSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
              </div>

              <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {filteredMeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No medicines found</p>
                ) : filteredMeds.map((m, i) => (
                  <motion.div key={m._id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.02 }}
                    className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[m.category, m.manufacturer, m.unit].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteMedicine(m._id)}
                      className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default PharmacyDashboard;