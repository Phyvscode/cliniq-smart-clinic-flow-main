import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, FileText, ClipboardList, Bell, Pill, Calendar, Droplets, Phone, MapPin } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { Prescription } from "@/data/mockData";

type Tab = "prescriptions" | "reports" | "reminders" | "profile";

const PatientMobilePage = () => {
  const { patients, getPatientPrescriptions } = useClinic();
  const [activeTab, setActiveTab] = useState<Tab>("prescriptions");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingRx, setLoadingRx] = useState(false);

  // Use first patient from state (logged-in patient would normally come from auth)
  const patient = patients[0];

  useEffect(() => {
    if (!patient) return;
    setLoadingRx(true);
    getPatientPrescriptions(patient.id)
      .then(setPrescriptions)
      .finally(() => setLoadingRx(false));
  }, [patient?.id]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "prescriptions", label: "Rx", icon: FileText },
    { key: "reports", label: "Reports", icon: ClipboardList },
    { key: "reminders", label: "Remind", icon: Bell },
    { key: "profile", label: "Profile", icon: User },
  ];

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">No patient data available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      <div className="bg-primary px-5 pt-8 pb-12 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary-foreground/70 text-xs">Welcome back</p>
            <h1 className="text-xl font-bold text-primary-foreground">{patient.name}</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "prescriptions" && (
            <motion.div key="rx" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground mb-0.5">Prescriptions</h2>
                <p className="text-xs text-muted-foreground">{prescriptions.length} records</p>
              </div>
              {loadingRx ? (
                <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
              ) : (
                <div className="space-y-3">
                  {prescriptions.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No prescriptions yet.</p>
                  )}
                  {prescriptions.map((rx, idx) => (
                    <motion.div
                      key={rx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="bg-card rounded-2xl border border-border p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{rx.date}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{rx.doctorName}</span>
                      </div>
                      <div className="space-y-2">
                        {rx.medicines.map((med, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Pill className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{med.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[med.morning && "Morning", med.afternoon && "Afternoon", med.evening && "Evening", med.night && "Night"]
                                  .filter(Boolean).join(", ")} · {med.durationDays} days
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {rx.notes && (
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border italic">
                          {rx.notes}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "reports" && (
            <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Reports</h3>
                <p className="text-sm text-muted-foreground">No lab reports uploaded yet.</p>
              </div>
            </motion.div>
          )}

          {activeTab === "reminders" && (
            <motion.div key="reminders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-center">
                <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Reminders</h3>
                <p className="text-sm text-muted-foreground">Medicine reminders coming soon.</p>
              </div>
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{patient.name}</h3>
                    <p className="text-sm text-muted-foreground">{patient.age} yrs · {patient.gender}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: Phone, label: "Phone", value: patient.phone },
                    { icon: Droplets, label: "Blood Group", value: patient.bloodGroup || "Not set" },
                    { icon: MapPin, label: "Address", value: patient.address || "Not set" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border px-2 py-2 flex justify-around">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PatientMobilePage;