import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Stethoscope, UserCheck, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";

type Role = "doctor" | "reception" | "pharmacist";

const LoginPage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role | null>(null);

  const handleLogin = () => {
    if (selected === "doctor")      navigate("/doctor");
    else if (selected === "reception")  navigate("/reception");
    else if (selected === "pharmacist") navigate("/pharmacy/login");
  };

  const roles = [
    { key: "doctor"     as Role, icon: Stethoscope, label: "Doctor",    desc: "View patients & prescribe" },
    { key: "reception"  as Role, icon: UserCheck,   label: "Reception", desc: "Manage queue & patients"   },
    { key: "pharmacist" as Role, icon: Pill,        label: "Pharmacy",  desc: "Dispense medicines"        },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">ClinIQ</h1>
          <p className="text-muted-foreground mt-1 text-sm">Smart Clinic Management</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {roles.map(role => (
            <motion.button
              key={role.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(role.key)}
              className={`flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-2xl border-2 transition-all duration-200 text-center ${
                selected === role.key
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selected === role.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <role.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">{role.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{role.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          onClick={handleLogin}
          disabled={!selected}
          className="w-full h-12 text-base font-medium rounded-xl"
          size="lg"
        >
          Continue
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Admin? Use the <span className="font-medium text-primary">ClinIQ Admin App</span>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;