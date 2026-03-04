import type { Role } from "@/data/contracts";

export const APP_NAV_ROUTES = ["/", "/designer", "/tasks", "/draft", "/saved-tasks", "/instances", "/admin", "/profile", "/docs"] as const;
export type AppNavRoute = (typeof APP_NAV_ROUTES)[number];

const NON_ADMIN_ALLOWED: AppNavRoute[] = ["/designer", "/tasks", "/draft", "/saved-tasks", "/profile", "/docs"];

export const ROUTE_TITLES: Record<AppNavRoute, string> = {
  "/": "Dashboard",
  "/designer": "Process Designer",
  "/tasks": "Task Console",
  "/draft": "Draft",
  "/saved-tasks": "Saved Tasks",
  "/instances": "Instance Monitor",
  "/admin": "Administration",
  "/profile": "Profile",
  "/docs": "Documentation",
};

export function isAdminRole(role?: Role | null): boolean {
  return role === "admin";
}

export function getAllowedNavRoutes(role?: Role | null): AppNavRoute[] {
  return isAdminRole(role) ? [...APP_NAV_ROUTES] : [...NON_ADMIN_ALLOWED];
}

export function canAccessRoute(role: Role | null | undefined, route: AppNavRoute): boolean {
  return getAllowedNavRoutes(role).includes(route);
}

export function getDefaultRouteForRole(role?: Role | null): AppNavRoute {
  return isAdminRole(role) ? "/" : "/tasks";
}

export function getRouteTitle(pathname: string): string {
  const matched = APP_NAV_ROUTES.find((route) => route === pathname);
  return matched ? ROUTE_TITLES[matched] : "HospitalBPM";
}
