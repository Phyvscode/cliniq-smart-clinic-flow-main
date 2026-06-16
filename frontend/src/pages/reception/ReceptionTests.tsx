import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, X, Check, UserCheck,
  Phone, IndianRupee, Banknote, Smartphone, CreditCard, Bell, KeyRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/context/ClinicContext";
import { Patient } from "@/data/mockData";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import ChangePinModal from "@/components/ChangePinModal";

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

const apiCreatePayment = async (body: object) => {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Payment failed");
  return data;
};

const calculateAge = (dob: string) => {
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const COMMON_TESTS = [
  { name: "CBC", fee: 300 }, { name: "Blood Sugar Fasting", fee: 80 },
  { name: "HbA1c", fee: 400 }, { name: "Lipid Profile", fee: 500 },
  { name: "LFT", fee: 600 }, { name: "KFT", fee: 500 },
  { name: "Thyroid Profile", fee: 700 }, { name: "Urine Routine", fee: 100 },
  { name: "X-Ray Chest", fee: 300 }, { name: "ECG", fee: 200 },
  { name: "USG Abdomen", fee: 800 }, { name: "CT Scan", fee: 3000 },
  { name: "Dengue Test", fee: 600 }, { name: "Malaria Test", fee: 150 },
  { name: "Vitamin D", fee: 900 }, { name: "Vitamin B12", fee: 700 },
];

const PAY_METHODS = [
  { key: "cash", label: "Cash",  icon: Banknote   },
  { key: "upi",  label: "UPI",   icon: Smartphone },
  { key: "card", label: "Card",  icon: CreditCard },
];

const ReceptionTests = () => {
  const { addPatient } = useClinic();
  const [showChangePin, setShowChangePin] = useState(false);

  const [phone,         setPhone]         = useState("");
  const [step,          setStep]          = useState<"idle" | "found" | "new">("idle");
  const [patient,       setPatient]       = useState<any>(null);
  const [name,          setName]          = useState("");
  const [dob,           setDob]           = useState("");
  const [gender,        setGender]        = useState<"Male" | "Female" | "Other" | "">("");
  const [selectedTests, setSelectedTests] = useState<{ name: string; fee: number }[]>([]);
  const [testSearch,    setTestSearch]    = useState("");
  const [payMethod,     setPayMethod]     = useState("cash");
  const [saving,        setSaving]        = useState(false);
  const [success,       setSuccess]       = useState("");
  const [error,         setError]         = useState("");

  const maxDate = new Date().toISOString().split("T")[0];
  const minDate = `${new Date().getFullYear() - 120}-01-01`;
  const total = selectedTests.reduce((s, t) => s + t.fee, 0);
  const filtered = COMMON_TESTS.filter(
    t => t.name.toLowerCase().includes(testSearch.toLowerCase()) &&
         !selectedTests.some(s => s.name === t.name)
  );

  const handleLookup = async () => {
    if (phone.trim().length < 7) return;
    const found = await apiLookupPhone(phone.trim());
    if (found) { setPatient(found); setStep("found"); }
    else        { setStep("new"); }
  };

  const handleRegister = async () => {
    if (!name.trim() || !dob || !gender) { setError("Fill in all patient details."); return; }
    try {
      const p = await addPatient({ name: name.trim(), dateOfBirth: dob, age: calculateAge(dob), gender, phone: phone.trim(), visitType: "OPD" } as Omit<Patient, "id">);
      setPatient(p); setStep("found");
    } catch (e: any) { setError(e.message); }
  };

  const handleCollect = async () => {
    if (!patient || selectedTests.length === 0) return;
    setSaving(true); setError("");
    try {
      await apiCreatePayment({
        patientId: patient.id || patient._id, amount: total,
        type: "test", method: payMethod,
        notes: selectedTests.map(t => `${t.name}: ₹${t.fee}`).join(" | "),
      });
      setSuccess(`₹${total} collected from ${patient.name}`);
      setPhone(""); setPatient(null); setStep("idle"); setSelectedTests([]);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const resetPatient = () => {
    setPhone(""); setPatient(null); setStep("idle");
    setName(""); setDob(""); setGender("");
    setSelectedTests([]); setError("");
  };

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="tests" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1" />
          <button onClick={() => setShowChangePin(true)} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Change PIN">
            <KeyRound className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Heading */}
            <div className="mb-8">
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">
                TESTS & BILLING
              </p>
              <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight">
                Order tests &{" "}
                <em className="text-gray-400 dark:text-gray-600 italic font-serif">collect</em>
                {" "}payment.
              </h1>
            </div>

            {success && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3 mb-6 max-w-xl">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">{success}</p>
              </motion.div>
            )}

            <div className="flex gap-6 max-w-4xl">
              {/* Left column: patient lookup */}
              <div className="w-80 shrink-0 space-y-4">
                <div className="bg-white dark:bg-[#0d0d1a] border border-gray-100 dark:border-white/8 rounded-2xl p-5">
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">PATIENT</p>

                  {patient ? (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3 flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{patient.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{patient.phone} · {patient.gender}</p>
                        </div>
                      </div>
                      <button onClick={resetPatient}
                        className="w-full h-9 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 transition-colors">
                        Change patient
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input type="tel" placeholder="Phone number…" value={phone}
                            onChange={e => { setPhone(e.target.value); setStep("idle"); }}
                            onKeyDown={e => e.key === "Enter" && handleLookup()}
                            className="pl-9 h-10 rounded-xl text-sm" />
                        </div>
                        <button onClick={handleLookup}
                          className="h-10 px-4 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                          Search
                        </button>
                      </div>

                      <AnimatePresence mode="wait">
                        {step === "new" && !patient && (
                          <motion.div key="new" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">New patient — fill in details</p>
                            </div>
                            <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="h-10 rounded-xl text-sm" />
                            <Input type="date" value={dob} min={minDate} max={maxDate} onChange={e => setDob(e.target.value)} className="h-10 rounded-xl text-sm" />
                            <div className="grid grid-cols-3 gap-1.5">
                              {(["Male", "Female", "Other"] as const).map(g => (
                                <button key={g} type="button" onClick={() => setGender(g)}
                                  className={`h-10 rounded-xl border text-xs font-medium transition-all ${gender === g ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}>
                                  {g}
                                </button>
                              ))}
                            </div>
                            {error && <p className="text-xs text-red-500">{error}</p>}
                            <button onClick={handleRegister} disabled={!name.trim() || !dob || !gender}
                              className="w-full h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-40">
                              Register Patient
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Payment method */}
                {patient && selectedTests.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#0d0d1a] border border-gray-100 dark:border-white/8 rounded-2xl p-5">
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-3">PAYMENT</p>
                    <div className="flex flex-col gap-2">
                      {PAY_METHODS.map(m => (
                        <button key={m.key} onClick={() => setPayMethod(m.key)}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${payMethod === m.key ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}>
                          <m.icon className="w-4 h-4" />{m.label}
                        </button>
                      ))}
                    </div>
                    {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                    <button onClick={handleCollect} disabled={saving}
                      className="w-full h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 mt-4">
                      {saving
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                        : `Collect ₹${total}`}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Right column: test selection */}
              <div className="flex-1 bg-white dark:bg-[#0d0d1a] border border-gray-100 dark:border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600">SELECT TESTS</p>
                  {selectedTests.length > 0 && (
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                      Total: ₹{total}
                    </span>
                  )}
                </div>

                {/* Selected tests */}
                {selectedTests.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    {selectedTests.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
                        <span className="flex-1 text-sm text-gray-900 dark:text-white">{t.name}</span>
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3 text-gray-400" />
                          <input type="number" value={t.fee}
                            onChange={e => setSelectedTests(prev => prev.map((x, j) => j === i ? { ...x, fee: Number(e.target.value) } : x))}
                            className="w-16 h-6 text-xs text-right bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 focus:outline-none" />
                        </div>
                        <button onClick={() => setSelectedTests(prev => prev.filter((_, j) => j !== i))}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search + list */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input placeholder="Search tests…" value={testSearch} onChange={e => setTestSearch(e.target.value)}
                    className="pl-8 h-9 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-1.5 overflow-y-auto max-h-96">
                  {filtered.map(t => (
                    <button key={t.name} onClick={() => setSelectedTests(prev => [...prev, { ...t }])}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{t.name}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-0.5 shrink-0 ml-2">
                        <IndianRupee className="w-3 h-3" />{t.fee}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>

      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default ReceptionTests;
