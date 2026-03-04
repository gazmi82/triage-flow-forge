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
  ChevronLeft,
  Hospital,
  LogOut,
} from "lucide-react";
import type { Role } from "@/data/contracts";
import { ROLE_LABELS } from "@/data/constants";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getAllowedNavRoutes, type AppNavRoute } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      {/* Logo */}
      <div className={cn("border-b border-sidebar-border", collapsed ? "px-2 py-4" : "px-5 py-5")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Hospital className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold leading-tight text-sidebar-accent-foreground">HospitalBPM</p>
              <p className="text-[10px] uppercase leading-tight tracking-wider text-sidebar-foreground/60">Process Engine</p>
            </div>
          )}
        </div>
        <div className={cn("mt-3 flex", collapsed ? "justify-center" : "justify-end")}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <Tooltip key={to} delayDuration={120}>
            <TooltipTrigger asChild>
              <NavLink
                to={to}
                end={to === "/"}
                className={cn(
                  "flex rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed
                    ? "items-center justify-center px-2 py-2.5 text-sidebar-foreground"
                    : "items-center gap-3 px-3 py-2.5 text-sidebar-foreground",
                )}
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
                {!collapsed && <ChevronRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-60" />}
              </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
          </Tooltip>
        ))}
      </nav>

      {/* User / Role */}
      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
        <div className={cn("rounded-md px-2 py-2", collapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-3")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">{user?.name ?? "Unknown User"}</p>
              <p className="text-[10px] text-sidebar-foreground/70 truncate">{ROLE_LABELS[currentRole]}</p>
            </div>
          )}
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
        {!collapsed && (
          <div className="mt-2 rounded-md bg-sidebar-accent/60 px-2 py-2">
            <p className="truncate text-[10px] text-sidebar-foreground/80">{user?.email}</p>
            <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-sidebar-foreground/60">
              <span>Session</span>
              <span>online</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
