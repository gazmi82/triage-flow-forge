import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  GitBranch,
  ClipboardList,
  Users,
  Activity,
  ChevronRight,
  Hospital,
  Settings,
} from "lucide-react";
import { ROLE_LABELS, type Role } from "@/data/mockData";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/designer", icon: GitBranch, label: "Process Designer" },
  { to: "/tasks", icon: ClipboardList, label: "Task Console" },
  { to: "/instances", icon: Activity, label: "Instances" },
  { to: "/admin", icon: Users, label: "Admin" },
];

const CURRENT_ROLE: Role = "physician";

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Hospital className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-accent-foreground leading-tight">HospitalBPM</p>
          <p className="text-[10px] text-sidebar-foreground/60 leading-tight uppercase tracking-wider">Process Engine</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{label}</span>
            <ChevronRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-60" />
          </NavLink>
        ))}
      </nav>

      {/* User / Role */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold flex-shrink-0">
            EC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">Dr. Emily Chen</p>
            <p className="text-[10px] text-sidebar-foreground/70 truncate">{ROLE_LABELS[CURRENT_ROLE]}</p>
          </div>
          <Settings className="h-4 w-4 text-sidebar-foreground/50 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
