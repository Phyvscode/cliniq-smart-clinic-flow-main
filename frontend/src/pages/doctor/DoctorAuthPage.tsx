import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, ChevronDown, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClinic } from "@/context/ClinicContext";
import ForgotPinModal from "@/components/ForgotPinModal";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

interface StaffMember {
  id: string;
  name: string;
  specialization?: string;
  photoUrl?: string | null;
}

const DoctorAuthPage = () => {
  const navigate = useNavigate();
  const { refreshPatients, refreshQueue, refreshMedicines } = useClinic();

  const [doctors,      setDoctors]      = useState<StaffMember[]>([]);
  const [selectedId,   setSelectedId]   = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pin,          setPin]          = useState(["", "", "", "", "", ""]);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [loadingList,  setLoadingList]  = useState(true);
  const [showForgot,   setShowForgot]   = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/auth/staff-list?role=doctor`)
      .then(r => r.json())
      .then(d => setDoctors(d.staff || []))
      .catch(() => setDoctors([]))
      .finally(() => setLoadingList(false));
  }, []);

  const selected = doctors.find(d => d.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDropdownOpen(false);
    setError("");
    setPin(["", "", "", "", "", ""]);
    document.getElementById("dpin-0")?.focus();
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 5) document.getElementById(`dpin-${index + 1}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0)
      document.getElementById(`dpin-${index - 1}`)?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newPin = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { if (i < 6) newPin[i] = ch; });
    setPin(newPin);
    const next = newPin.findIndex(v => !v);
    document.getElementById(`dpin-${next === -1 ? 5 : next}`)?.focus();
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

      // Navigate immediately — refresh context in background
      navigate("/doctor/dashboard");

      // Refresh context data after navigation (non-blocking)
      Promise.all([
        refreshPatients().catch(() => {}),
        refreshQueue().catch(() => {}),
        refreshMedicines().catch(() => {}),
      ]);

    } catch (err: any) {
      setError(err.message || "Login failed");
      setPin(["", "", "", "", "", ""]);
      document.getElementById("dpin-0")?.focus();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative">
      <button onClick={() => navigate("/")} className="absolute top-4 right-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }} className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Doctor Login</h1>
          <p className="text-muted-foreground mt-1 text-sm">Select your name and enter your PIN</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mb-4">

          {/* Dropdown */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Select Your Name
            </label>
            <div className="relative">
              <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full h-14 rounded-xl border border-border bg-card text-foreground px-3 pr-10 text-sm flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-ring">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                  {selected?.photoUrl
                    ? <img src={selected.photoUrl} alt={selected.name} className="w-full h-full object-cover" />
                    : <User className="w-4 h-4 text-primary" />}
                </div>
                <span className={`flex-1 text-left truncate ${!selected ? "text-muted-foreground" : ""}`}>
                  {loadingList ? "Loading doctors..." : selected
                    ? `${selected.name}${selected.specialization ? ` — ${selected.specialization}` : ""}`
                    : "Select your name..."}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                    {doctors.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No doctors added yet. Ask admin to add you.
                      </div>
                    ) : doctors.map(d => (
                      <button key={d.id} type="button" onClick={() => handleSelect(d.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-muted transition-colors text-left ${
                          selectedId === d.id ? "bg-primary/5" : ""
                        }`}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                          {d.photoUrl
                            ? <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                            : <User className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                          {d.specialization && (
                            <p className="text-xs text-muted-foreground truncate">{d.specialization}</p>
                          )}
                        </div>
                        {selectedId === d.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* PIN boxes */}
          {selectedId && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
                Enter Your 6-Digit PIN
              </label>
              <div className="flex gap-2 justify-between" onPaste={handlePaste}>
                {pin.map((digit, i) => (
                  <input key={i} id={`dpin-${i}`} type="password" inputMode="numeric"
                    maxLength={1} value={digit}
                    onChange={e => handlePinChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background text-foreground focus:outline-none transition-all ${
                      digit ? "border-primary bg-primary/5" : "border-border focus:border-primary"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" disabled={loading || !selectedId || pin.join("").length < 6}
            className="w-full h-12 text-base font-medium rounded-xl" size="lg">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center">
          <button onClick={() => setShowForgot(true)} className="text-sm text-primary hover:underline font-medium">
            Forgot your PIN?
          </button>
        </div>
      </motion.div>

      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}

      <ForgotPinModal open={showForgot} onClose={() => setShowForgot(false)} />
    </div>
  );
};

export default DoctorAuthPage;