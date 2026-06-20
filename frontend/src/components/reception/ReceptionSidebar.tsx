import { useNavigate } from "react-router-dom";
import {
  Users, Calendar, Phone, BedDouble, FlaskConical,
  ClipboardList, LogOut, ChevronLeft,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { key: "reception",    icon: Users,         label: "Reception",       path: "/reception/dashboard"    },
  { key: "appointments", icon: Calendar,      label: "Appointments",    path: "/reception/appointments" },
  { key: "tests",        icon: FlaskConical,  label: "Tests",           path: "/reception/tests"        },
  { key: "followups",    icon: Phone,         label: "Follow-ups",      path: "/reception/followups"    },
  { key: "beds",         icon: BedDouble,     label: "Beds & Cabins",   path: "/reception/beds"         },
  { key: "history",      icon: ClipboardList, label: "Patient History", path: "/reception/history"   },
];

export type ReceptionNav = "reception" | "appointments" | "tests" | "followups" | "beds" | "history";

interface Props { active: ReceptionNav; }

const ReceptionSidebar = ({ active }: Props) => {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("cliniq_user");
  const userName   = storedUser ? JSON.parse(storedUser).name : "Receptionist";

  const handleLogout = () => {
    localStorage.removeItem("cliniq_token");
    localStorage.removeItem("cliniq_user");
    navigate("/");
  };

  return (
    <div className="w-[220px] shrink-0 bg-white dark:bg-[#0d0d1a] border-r border-gray-100 dark:border-white/5 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100 dark:border-white/5">
        <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center shrink-0">
          <span className="text-white dark:text-gray-900 text-xs font-bold">C</span>
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-sm">ClinIQ</span>
        <span className="text-[10px] text-gray-400 font-light">os</span>
        <div className="ml-auto"><ThemeToggle /></div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const isActive   = item.key === active;
          const isDisabled = item.path === null;
          return (
            <button key={item.key}
              onClick={() => item.path && navigate(item.path)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                isActive
                  ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium"
                  : isDisabled
                    ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}>
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
              {isActive && <ChevronLeft className="w-3 h-3 ml-auto rotate-180 text-gray-400 dark:text-gray-600" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-gray-100 dark:border-white/5 pt-3 space-y-1">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5">
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-gray-600 dark:text-white/80">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white/80 truncate">{userName}</p>
            <p className="text-[10px] text-gray-400 truncate">Front desk · Receptionist</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionSidebar;
