import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Stethoscope, UserCheck, Pill, FlaskConical, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const roles = [
  { key: "doctor",     icon: Stethoscope,  category: "CLINICAL",    label: "Doctor",       desc: "Pick your profile and sign in with PIN",  route: "/doctor"         },
  { key: "reception",  icon: UserCheck,    category: "FRONT DESK",  label: "Receptionist", desc: "Register patients, tokens & queue",        route: "/reception"      },
  { key: "pharmacist", icon: Pill,         category: "PHARMACY",    label: "Pharmacist",   desc: "Dispense, billing & inventory",            route: "/pharmacy/login" },
  { key: "lab",        icon: FlaskConical, category: "LABORATORY",  label: "Lab Portal",   desc: "View test orders & upload reports",        route: "/lab"            },
];

const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f0f8] dark:bg-[#0a0a0f] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center shrink-0">
            <span className="text-white dark:text-gray-900 text-sm font-bold leading-none">C</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">ClinIQ</span>
          <span className="text-xs text-gray-400 font-light">os</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            All systems nominal
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center w-full max-w-3xl">

          <div className="inline-flex items-center gap-2 border border-gray-300/60 dark:border-gray-700 rounded-full px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400 mb-8 bg-white/60 dark:bg-white/5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 inline-block" />
            WELCOME TO CLINIQ
          </div>

          <h1 className="text-5xl lg:text-6xl font-serif text-gray-900 dark:text-white leading-[1.1] mb-5">
            Choose how you'll{" "}
            <em className="text-gray-400 dark:text-gray-600 not-italic font-serif italic">enter</em>
            {" "}the hospital
            <br />today.
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-lg mb-14">
            One calm, connected workspace for every member of your team.
          </p>

          <div className="grid grid-cols-4 gap-4 max-w-3xl mx-auto">
            {roles.map((role, i) => (
              <motion.button
                key={role.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                whileHover={{ y: -2 }}
                onClick={() => navigate(role.route)}
                className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 text-left border border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-200 group"
              >
                <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-7">
                  <role.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
                </div>
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-1.5">
                  {role.category}
                </p>
                <p className="text-2xl font-serif text-gray-900 dark:text-white mb-1.5">{role.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{role.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-6 px-8 py-4 text-xs text-gray-400 dark:text-gray-600 border-t border-gray-200/60 dark:border-gray-800/60">
        <span>Secured with end-to-end encryption</span>
        <span className="text-gray-300 dark:text-gray-700">|</span>
        <span>HIPAA • ISO 27001</span>
        <span className="text-gray-300 dark:text-gray-700">|</span>
        <span>Last sync • just now</span>
      </footer>
    </div>
  );
};

export default LoginPage;
