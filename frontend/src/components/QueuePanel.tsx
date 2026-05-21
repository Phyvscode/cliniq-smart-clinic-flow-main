import { motion, AnimatePresence } from "framer-motion";
import { useClinic } from "@/context/ClinicContext";
import { User, Clock } from "lucide-react";

const QueuePanel = () => {
  const { queue, patients } = useClinic();
  const activeQueue = queue.filter(q => q.status !== "done");

  return (
    <div className="p-4">
      <h3 className="font-semibold text-foreground mb-1 text-sm">Live Queue</h3>
      <p className="text-xs text-muted-foreground mb-4">{activeQueue.length} patients waiting</p>

      <div className="space-y-2">
        <AnimatePresence>
          {activeQueue.map((entry, i) => {
            const patient = patients.find(p => p.id === entry.patientId);
            if (!patient) return null;
            const isCurrent = entry.status === "in-consultation";

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isCurrent
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/50"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {entry.queueNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isCurrent ? (
                      <span className="text-primary font-medium">In consultation</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Waiting
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {activeQueue.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No patients in queue</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueuePanel;
