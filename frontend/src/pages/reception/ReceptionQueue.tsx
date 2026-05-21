import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SkipForward, Users } from "lucide-react";
import AdminPortal from "@/components/AdminPortal";
import { Button } from "@/components/ui/button";
import { useClinic } from "@/context/ClinicContext";

const ReceptionQueue = () => {
  const navigate = useNavigate();
  const { queue, patients, nextPatient } = useClinic();
  const activeQueue = queue.filter(q => q.status !== "done");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Live Queue</h1>
            <p className="text-xs text-muted-foreground">ClinIQ</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AdminPortal />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{activeQueue.length} patients</h2>
            <p className="text-sm text-muted-foreground">Today's queue</p>
          </div>
          <Button onClick={nextPatient} disabled={!activeQueue.find(q => q.status === "in-consultation")} className="gap-2 rounded-xl">
            <SkipForward className="w-4 h-4" /> Next Patient
          </Button>
        </div>

        <div className="space-y-2">
          {activeQueue.map((entry, i) => {
            const patient = patients.find(p => p.id === entry.patientId);
            if (!patient) return null;
            const isCurrent = entry.status === "in-consultation";

            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  isCurrent ? "bg-primary/10 border-2 border-primary/30" : "bg-card border border-border"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                  isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {entry.queueNumber}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">{patient.age} yrs · {patient.gender}</p>
                </div>
                {isCurrent && (
                  <span className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full animate-pulse-soft">
                    Now
                  </span>
                )}
              </motion.div>
            );
          })}

          {activeQueue.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Queue is empty</p>
              <p className="text-sm">Add patients from the reception desk</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionQueue;