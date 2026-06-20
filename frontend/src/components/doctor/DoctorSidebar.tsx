import { useNavigate } from "react-router-dom";
import {
  Calendar, Stethoscope, FlaskConical, BedDouble,
  ClipboardList, LogOut, ChevronLeft,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { key: "appointments", icon: Calendar,      label: "Appointments", path: "/doctor/dashboard"     },
  { key: "consultation", icon: Stethoscope,   label: "Consultation", path: "/doctor/consultation"  },
  { key: "laboratory",   icon: FlaskConical,  label: "Laboratory",   path: null                    },
  { key: "ipd",          icon: BedDouble,     label: "IPD",          path: null                    },
  { key: "history",      icon: ClipboardList, label: "Patient History", path: "/doctor/history"   },
];

interface Props {
  active: "appointments" | "consultation" | "history";
}

const DoctorSidebar = ({ active }: Props) => {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("cliniq_user");
  const doctorName = storedUser ? JSON.parse(storedUser).name : "Doctor";
  const doctorSpec = storedUser ? (JSON.parse(storedUser).specialization || "General Medicine") : "";

  const handleLogout = () => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
    navigate("/");
  };

  return (
    <div className="w-[220px] shrink-0 bg-[#0d0d1a] dark:bg-[#050508] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
          <span className="text-gray-900 text-xs font-bold">C</span>
        </div>
        <span className="font-semibold text-white text-sm">ClinIQ</span>
        <span className="text-[10px] text-gray-500 font-light">os</span>
        <div className="ml-auto">
          <ThemeToggle className="text-gray-500 hover:text-gray-300 hover:bg-white/10 w-7 h-7" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const isActive = item.key === active;
          const isDisabled = item.path === null;
          return (
            <button
              key={item.key}
              onClick={() => item.path && navigate(item.path)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : isDisabled
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
              {isActive && <ChevronLeft className="w-3 h-3 ml-auto rotate-180 text-gray-400" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3 space-y-1">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all">
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Sign out</span>
        </button>

        {/* Doctor card */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/5">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-white/80">
              {doctorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{doctorName}</p>
            <p className="text-[10px] text-gray-500 truncate">
              Clinical{doctorSpec ? ` · ${doctorSpec}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorSidebar;
