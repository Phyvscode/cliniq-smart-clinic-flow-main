import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Stethoscope, User, ChevronRight, LogOut, KeyRound, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useClinic } from "@/context/ClinicContext";
import QueuePanel from "@/components/QueuePanel";
import ChangePinModal from "@/components/ChangePinModal";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { queue, patients, refreshQueue, refreshPatients } = useClinic();

  // Poll every 5s for real-time queue updates
  useEffect(() => {
    refreshQueue();
    refreshPatients();
    const interval = setInterval(() => {
      refreshQueue();
      refreshPatients();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const [showChangePin, setShowChangePin] = useState(false);

  const storedUser = localStorage.getItem("cliniq_user");
  const doctorName = storedUser ? JSON.parse(storedUser).name : "Doctor";

  const activeQueue = queue.filter(q => q.status !== "done");

  const queuePatients = activeQueue
    .map(q => {
      // Use _patient stored directly on queue entry (from populated response)
      // Fall back to patients store if needed
      const patient = q._patient
        || patients.find(p => p.id === q.patientId)
        || null;
      return { queueEntry: q, patient };
    })
    .filter(item => item.patient !== null);

  const handleLogout = () => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Dr. {doctorName}</h1>
            <p className="text-xs text-muted-foreground">ClinIQ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1">{activeQueue.length} in queue</span>
          <button onClick={refreshQueue} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Refresh queue">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Button variant="ghost" size="sm" onClick={() => setShowChangePin(true)}
            className="gap-1.5 text-muted-foreground hover:text-foreground">
            <KeyRound className="w-4 h-4" /> Change PIN
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="gap-1.5 text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        <div className="flex-1 p-8 max-w-3xl mx-auto">
          {queuePatients.length > 0 ? (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Patients in Queue</h2>
              <p className="text-sm text-muted-foreground mb-6">Tap a patient to start consultation</p>
              <div className="space-y-3">
                {queuePatients.map((item, index) => (
                  <motion.button
                    key={item.queueEntry.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/doctor/diagnosis?patientId=${item.patient.id}`)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">{item.patient.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.patient.age} yrs • {item.patient.gender}
                        {item.patient.bloodGroup && ` • ${item.patient.bloodGroup}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.queueEntry.status === "in-consultation" ? "default" : "secondary"} className="text-xs">
                        #{item.queueEntry.queueNumber}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Stethoscope className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">No patients in queue</h2>
              <p className="text-sm text-muted-foreground">Waiting for reception to add patients</p>
            </motion.div>
          )}
        </div>

        <div className="w-80 border-l border-border bg-card overflow-y-auto hidden lg:block">
          <QueuePanel />
        </div>
      </div>

      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </div>
  );
};

export default DoctorDashboard;