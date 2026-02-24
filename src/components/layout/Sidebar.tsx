import { NavLink } from "@/components/NavLink";
import {
  type LucideIcon,
  LayoutDashboard,
  GitBranch,
  ClipboardList,
  FileText,
  Archive,
  Users,
  Activity,
  BookOpen,
  ChevronRight,
  Hospital,
  LogOut,
} from "lucide-react";
import type { Role } from "@/data/mockData";
import { ROLE_LABELS } from "@/data/constants";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getAllowedNavRoutes, type AppNavRoute } from "@/lib/permissions";

const NAV_ITEMS: Array<{ to: AppNavRoute; icon: LucideIcon; label: string }> = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/designer", icon: GitBranch, label: "Process Designer" },
  { to: "/tasks", icon: ClipboardList, label: "Task Console" },
  { to: "/draft", icon: FileText, label: "Draft" },
  { to: "/saved-tasks", icon: Archive, label: "Saved Tasks" },
  { to: "/instances", icon: Activity, label: "Instances" },
  { to: "/admin", icon: Users, label: "Admin" },
  { to: "/docs", icon: BookOpen, label: "Documentation" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const currentRole: Role = user?.role ?? "physician";
  const initials =
    user?.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "NA";
  const allowedRoutes = getAllowedNavRoutes(currentRole);
  const visibleItems = NAV_ITEMS.filter((item) => allowedRoutes.includes(item.to));

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
        {visibleItems.map(({ to, icon: Icon, label }) => (
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
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">{user?.name ?? "Unknown User"}</p>
            <p className="text-[10px] text-sidebar-foreground/70 truncate">{ROLE_LABELS[currentRole]}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
          </Button>
        </div>
        <div className="mt-2 rounded-md bg-sidebar-accent/60 px-2 py-2">
          <p className="truncate text-[10px] text-sidebar-foreground/80">{user?.email}</p>
          <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-sidebar-foreground/60">
            <span>Mock session</span>
            <span>online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
