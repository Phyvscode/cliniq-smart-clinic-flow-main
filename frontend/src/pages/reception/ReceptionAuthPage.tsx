import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, Lock, UserCheck } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import ForgotPinModal from "@/components/ForgotPinModal";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

interface StaffMember {
  id:          string;
  name:        string;
  department?: string;
  photoUrl?:   string | null;
}

const ReceptionAuthPage = () => {
  const navigate = useNavigate();
  const { refreshPatients, refreshQueue } = useClinic();

  const [staff,        setStaff]        = useState<StaffMember[]>([]);
  const [selectedId,   setSelectedId]   = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pin,          setPin]          = useState(["", "", "", "", "", ""]);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [loadingList,  setLoadingList]  = useState(true);
  const [showForgot,   setShowForgot]   = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/auth/staff-list?role=reception`)
      .then(r => r.json())
      .then(d => setStaff(d.staff || []))
      .catch(() => setStaff([]))
      .finally(() => setLoadingList(false));
  }, []);

  const selected = staff.find(s => s.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDropdownOpen(false);
    setError("");
    setPin(["", "", "", "", "", ""]);
    setTimeout(() => document.getElementById("rpin-0")?.focus(), 50);
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 5) document.getElementById(`rpin-${index + 1}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0)
      document.getElementById(`rpin-${index - 1}`)?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newPin = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { if (i < 6) newPin[i] = ch; });
    setPin(newPin);
    const next = newPin.findIndex(v => !v);
    document.getElementById(`rpin-${next === -1 ? 5 : next}`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) { setError("Please select your name."); return; }
    const pinCode = pin.join("");
    if (pinCode.length < 6) { setError("Please enter your 6-digit PIN."); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/auth/pin-login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: selectedId, pin: pinCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("cliniq_token", data.token);
      localStorage.setItem("cliniq_user",  JSON.stringify(data.user));

      navigate("/reception/dashboard");
      Promise.all([
        refreshPatients().catch(() => {}),
        refreshQueue().catch(() => {}),
      ]);
    } catch (err: any) {
      setError(err.message || "Login failed");
      setPin(["", "", "", "", "", ""]);
      document.getElementById("rpin-0")?.focus();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f8] dark:bg-[#0a0a0f] flex items-center justify-center p-6">
      {/* Logo top-left */}
      <div className="absolute top-5 left-8 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
          <span className="text-white dark:text-gray-900 text-sm font-bold">C</span>
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-sm">ClinIQ</span>
        <span className="text-xs text-gray-400 font-light">os</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-800 w-full max-w-sm p-8 relative">

        {/* Close */}
        <button onClick={() => navigate("/")}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-7">
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">RECEPTION SIGN-IN</p>
          <h1 className="text-3xl font-serif text-gray-900 dark:text-white">Welcome back</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Profile dropdown */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">PROFILE</p>
            <div className="relative">
              <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`w-full h-12 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 pr-10 flex items-center gap-3 focus:outline-none transition-all ${
                  dropdownOpen
                    ? "border-gray-900 dark:border-gray-400 ring-1 ring-gray-900/10 dark:ring-gray-400/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}>
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {selected?.photoUrl
                    ? <img src={selected.photoUrl} alt={selected.name} className="w-full h-full object-cover" />
                    : <UserCheck className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />}
                </div>
                <div className="flex-1 text-left">
                  {loadingList
                    ? <span className="text-sm text-gray-400">Loading…</span>
                    : selected
                      ? <>
                          <p className="text-sm font-medium leading-tight">{selected.name}</p>
                          <p className="text-xs text-gray-400">Receptionist</p>
                        </>
                      : <span className="text-sm text-gray-400">Select your profile</span>
                  }
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                    {staff.length === 0
                      ? <div className="px-4 py-6 text-center text-sm text-gray-400">No reception staff added. Ask admin to add you.</div>
                      : staff.map(s => (
                        <button key={s.id} type="button" onClick={() => handleSelect(s.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                            selectedId === s.id ? "bg-gray-50 dark:bg-gray-700" : ""
                          }`}>
                          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                            {s.photoUrl
                              ? <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                              : <UserCheck className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                            <p className="text-xs text-gray-400 truncate">Receptionist</p>
                          </div>
                        </button>
                      ))
                    }
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* PIN */}
          <AnimatePresence>
            {selectedId && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">6-DIGIT PIN</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                  <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex gap-2 flex-1 justify-center" onPaste={handlePaste}>
                    {pin.map((digit, i) => (
                      <input key={i} id={`rpin-${i}`} type="password" autoComplete="off"
                        inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handlePinChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        className={`w-8 h-8 text-center text-lg font-bold rounded-lg border-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none transition-all ${
                          digit ? "border-gray-900 dark:border-gray-300" : "border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm text-red-500 text-center">{error}</motion.p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => navigate("/")}
              className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit"
              disabled={loading || !selectedId || pin.join("").length < 6}
              className="flex-1 h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <button onClick={() => setShowForgot(true)} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Forgot your PIN?
          </button>
        </div>
      </motion.div>

      {dropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />}
      <ForgotPinModal open={showForgot} onClose={() => setShowForgot(false)} />
    </div>
  );
};

export default ReceptionAuthPage;
