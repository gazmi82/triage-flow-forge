import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getRouteTitle, isAdminRole } from "@/lib/permissions";
import {
  Bell,
  CircleUserRound,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const initials = useMemo(
    () =>
      user?.name
        ?.split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() ?? "NA",
    [user],
  );

  const title = getRouteTitle(location.pathname);
  const isAdmin = isAdminRole(user?.role);

  const showNotImplemented = (label: string) => {
    toast({
      title: `${label} (mock)`,
      description: "This action is a UI placeholder in the mock build.",
    });
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          Mock authenticated workspace
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => showNotImplemented("Notifications")}
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2"
              aria-label="Open user menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="max-w-[180px] truncate text-xs font-semibold">
                  {user?.name}
                </p>
                <p className="max-w-[180px] truncate text-[10px] text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="pb-1">
              <p className="truncate text-xs">{user?.name}</p>
              <p className="truncate text-[10px] font-normal text-muted-foreground">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => showNotImplemented("Profile")}>
              <UserRound className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onSelect={() => navigate("/admin")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => showNotImplemented("Account")}>
              <CircleUserRound className="mr-2 h-4 w-4" />
              Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                logout();
                navigate("/auth");
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
