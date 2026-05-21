import { useNavigate, useLocation } from "react-router-dom";
import { Settings, Users, Stethoscope, ClipboardList, LayoutDashboard, LogOut, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/reception", label: "Reception", icon: ClipboardList },
  { path: "/queue", label: "Live Queue", icon: Users },
  { path: "/doctor", label: "Doctor Dashboard", icon: Stethoscope },
  { path: "/patient", label: "Patient View", icon: LayoutDashboard },
];

const AdminPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-lg">
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Admin</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <Settings className="w-3 h-3" />
          Quick Navigation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {navItems.map((item) => (
          <DropdownMenuItem
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`gap-2 cursor-pointer ${
              location.pathname === item.path ? "bg-accent font-medium" : ""
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/")} className="gap-2 cursor-pointer text-destructive">
          <LogOut className="w-4 h-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminPortal;
