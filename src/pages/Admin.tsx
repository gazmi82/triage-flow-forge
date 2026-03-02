import { useEffect, useMemo, useState } from "react";
import { type AdminLogEntry, type AdminLogSummary, type LogLevel, type Role } from "@/data/contracts";
import { RoleBadge, StatusBadge } from "@/components/ui/Badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { GitBranch, Users, CheckCircle2, XCircle, Plus, ChartNoAxesCombined, RefreshCcw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk, createUserThunk } from "@/store/slices/workflowSlice";
import { ROLE_LABELS } from "@/data/constants";
import { useToast } from "@/hooks";
import { appApi } from "@/data/appApi";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis } from "recharts";

const EMPTY_LOG_SUMMARY: AdminLogSummary = {
  total: 0,
  incidents: 0,
  byLevel: {},
  byChannel: {},
  timeline: [],
};

const LOG_LEVEL_ORDER: LogLevel[] = ["debug", "info", "warn", "error"];
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "#64748b",
  info: "#2563eb",
  warn: "#d97706",
  error: "#dc2626",
};

const levelBadgeClass: Record<LogLevel, string> = {
  debug: "border-slate-300 text-slate-600",
  info: "border-blue-300 text-blue-700",
  warn: "border-amber-300 text-amber-700",
  error: "border-red-300 text-red-700",
};

type AdminLogFilterState = {
  level: "all" | LogLevel;
  channel: string;
  search: string;
  sinceMinutes: string;
  limit: string;
};

const initialLogFilterState: AdminLogFilterState = {
  level: "all",
  channel: "all",
  search: "",
  sinceMinutes: "180",
  limit: "200",
};

const LOG_ROWS_PER_PAGE_OPTIONS = [20, 50, 100] as const;

const enrichLogFieldsWithCreationParts = (entry: AdminLogEntry): Record<string, unknown> => {
  return {
    createdAt: entry.timestamp,
    ...(entry.fields ?? {}),
  };
};

const formatLogFields = (entry: AdminLogEntry): string => {
  return JSON.stringify(enrichLogFieldsWithCreationParts(entry), null, 2);
};

const formatLogFieldsRaw = (entry: AdminLogEntry): string => {
  return JSON.stringify(enrichLogFieldsWithCreationParts(entry));
};

const toLogApiFilter = (filter: AdminLogFilterState) => {
  const sinceMinutes = Number(filter.sinceMinutes);
  const limit = Number(filter.limit);
  return {
    level: filter.level,
    channel: filter.channel,
    search: filter.search.trim(),
    sinceMinutes: Number.isFinite(sinceMinutes) && sinceMinutes > 0 ? sinceMinutes : 180,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 200,
  };
};

export default function Admin() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("definitions");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "triage_nurse" as Role,
    department: "Emergency",
  });
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [isSubmittingCreateUser, setIsSubmittingCreateUser] = useState(false);
  const [logEntries, setLogEntries] = useState<AdminLogEntry[]>([]);
  const [logSummary, setLogSummary] = useState<AdminLogSummary>(EMPTY_LOG_SUMMARY);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logFilters, setLogFilters] = useState<AdminLogFilterState>(initialLogFilterState);
  const [appliedLogFilters, setAppliedLogFilters] = useState<AdminLogFilterState>(initialLogFilterState);
  const [logRefreshTick, setLogRefreshTick] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState<number>(20);
  const [logCurrentPage, setLogCurrentPage] = useState<number>(1);
  const [logFieldViewMode, setLogFieldViewMode] = useState<Record<string, "raw" | "json">>({});
  const users = useAppSelector((state) => state.workflow.users);
  const definitions = useAppSelector((state) => state.workflow.definitions);
  const instances = useAppSelector((state) => state.workflow.instances);
  const tasks = useAppSelector((state) => state.workflow.tasks);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  useEffect(() => {
    if (activeTab !== "logs") {
      return;
    }

    let cancelled = false;
    const loadLogs = async () => {
      setIsLoadingLogs(true);
      setLogError(null);
      try {
        const query = toLogApiFilter(appliedLogFilters);
        const [entriesPayload, summaryPayload] = await Promise.all([
          appApi.fetchAdminLogs(query),
          appApi.fetchAdminLogSummary(query),
        ]);
        if (cancelled) {
          return;
        }
        setLogEntries(entriesPayload.entries);
        setLogSummary(summaryPayload);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLogError(error instanceof Error ? error.message : "Unable to load logs.");
      } finally {
        if (!cancelled) {
          setIsLoadingLogs(false);
        }
      }
    };

    void loadLogs();
    return () => {
      cancelled = true;
    };
  }, [activeTab, appliedLogFilters, logRefreshTick]);

  const roles: Role[] = useMemo(
    () => ["reception", "triage_nurse", "physician", "lab", "radiology", "admin"],
    []
  );

  const definitionInstanceCounts = useMemo(
    () =>
      instances.reduce<Record<string, number>>((acc, instance) => {
        acc[instance.definitionId] = (acc[instance.definitionId] ?? 0) + 1;
        return acc;
      }, {}),
    [instances]
  );

  const roleMetrics = useMemo(() => {
    return roles.map((role) => {
      const roleUsers = users.filter((user) => user.role === role);
      const roleTasks = tasks.filter((task) => task.role === role);
      const roleActiveInstances = instances.filter((instance) =>
        role === "admin"
          ? true
          : roleTasks.some((task) => task.instanceId === instance.id) && instance.status === "active"
      );
      return {
        role,
        totalUsers: roleUsers.length,
        activeUsers: roleUsers.filter((user) => user.active).length,
        openTasks: roleTasks.filter((task) => task.status !== "completed").length,
        claimedTasks: roleTasks.filter((task) => task.status === "claimed").length,
        overdueTasks: roleTasks.filter((task) => task.status === "overdue").length,
        activeInstances: role === "admin" ? instances.filter((instance) => instance.status === "active").length : roleActiveInstances.length,
      };
    });
  }, [instances, roles, tasks, users]);

  const availableChannels = useMemo(() => {
    const channels = new Set<string>(["all"]);
    Object.keys(logSummary.byChannel).forEach((channel) => channels.add(channel));
    return Array.from(channels);
  }, [logSummary.byChannel]);

  const levelChartData = useMemo(
    () =>
      LOG_LEVEL_ORDER.map((level) => ({
        level,
        count: logSummary.byLevel[level] ?? 0,
      })),
    [logSummary.byLevel]
  );

  const channelChartData = useMemo(
    () =>
      Object.entries(logSummary.byChannel)
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [logSummary.byChannel]
  );

  const timelineChartData = useMemo(
    () =>
      logSummary.timeline.map((point) => ({
        bucket: new Date(`${point.bucket}:00Z`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        count: point.count,
      })),
    [logSummary.timeline]
  );

  const logTotalPages = useMemo(
    () => Math.max(1, Math.ceil(logEntries.length / logRowsPerPage)),
    [logEntries.length, logRowsPerPage]
  );

  const pagedLogEntries = useMemo(() => {
    const start = (logCurrentPage - 1) * logRowsPerPage;
    return logEntries.slice(start, start + logRowsPerPage);
  }, [logCurrentPage, logEntries, logRowsPerPage]);

  const pagedLogRange = useMemo(() => {
    if (logEntries.length === 0) {
      return { from: 0, to: 0 };
    }
    const from = (logCurrentPage - 1) * logRowsPerPage + 1;
    const to = Math.min(logCurrentPage * logRowsPerPage, logEntries.length);
    return { from, to };
  }, [logCurrentPage, logEntries.length, logRowsPerPage]);

  useEffect(() => {
    if (logCurrentPage > logTotalPages) {
      setLogCurrentPage(logTotalPages);
    }
  }, [logCurrentPage, logTotalPages]);

  const resetCreateUserForm = () => {
    setCreateUserForm({
      name: "",
      email: "",
      password: "",
      role: "triage_nurse",
      department: "Emergency",
    });
    setCreateUserError(null);
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateUserError(null);

    if (createUserForm.password.length < 6) {
      setCreateUserError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmittingCreateUser(true);
    const result = await dispatch(
      createUserThunk({
        name: createUserForm.name,
        email: createUserForm.email,
        password: createUserForm.password,
        role: createUserForm.role,
        department: createUserForm.department,
        active: true,
      })
    );
    setIsSubmittingCreateUser(false);

    if (createUserThunk.rejected.match(result)) {
      setCreateUserError(result.error.message ?? "Unable to create user.");
      return;
    }

    toast({
      title: "User created",
      description: `${result.payload.createdUser.name} was added as ${ROLE_LABELS[result.payload.createdUser.role]}.`,
    });
    setIsCreateUserOpen(false);
    resetCreateUserForm();
  };

  const applyLogFilters = () => {
    setAppliedLogFilters(logFilters);
    setLogCurrentPage(1);
  };

  const refreshLogs = () => {
    setLogRefreshTick((prev) => prev + 1);
  };

  const getLogEntryKey = (entry: AdminLogEntry, index: number): string =>
    `${entry.timestamp}|${entry.channel}|${entry.message}|${entry.requestId ?? ""}|${entry.traceId ?? ""}|${index}`;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold">Administration</h1>
        <p className="text-xs text-muted-foreground">Manage users, roles, and process definitions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="definitions" className="gap-1.5 text-xs">
            <GitBranch className="h-3.5 w-3.5" />
            Process Definitions
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <ChartNoAxesCombined className="h-3.5 w-3.5" />
            Logs & Incidents
          </TabsTrigger>
        </TabsList>

        {/* Definitions Tab */}
        <TabsContent value="definitions" className="mt-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Process Registry</p>
              <Badge variant="secondary" className="ml-auto text-xs">{definitions.length} definitions</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Key</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Version</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Lanes</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Instances</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Last Updated</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {definitions.map((def) => (
                    <tr key={def.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold">{def.name}</p>
                          <p className="text-muted-foreground text-[10px] mt-0.5">{def.description.substring(0, 60)}…</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{def.key}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] font-mono">v{def.version}</Badge>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={def.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {def.lanes.map(lane => (
                            <RoleBadge key={lane} role={lane} className="text-[9px] px-1.5 py-0" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{definitionInstanceCounts[def.id] ?? 0}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(def.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {definitionInstanceCounts[def.id] ?? 0} live references
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                resetCreateUserForm();
                setIsCreateUserOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add User
            </Button>
          </div>

          {/* Role workload matrix */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Role Workload Matrix</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Live operational metrics by role</p>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-left pb-2 font-semibold text-muted-foreground w-40">Role</th>
                    <th className="text-center pb-2 font-semibold text-muted-foreground px-2">Active Users</th>
                    <th className="text-center pb-2 font-semibold text-muted-foreground px-2">Total Users</th>
                    <th className="text-center pb-2 font-semibold text-muted-foreground px-2">Open Tasks</th>
                    <th className="text-center pb-2 font-semibold text-muted-foreground px-2">Claimed</th>
                    <th className="text-center pb-2 font-semibold text-muted-foreground px-2">Overdue</th>
                    <th className="text-center pb-2 font-semibold text-muted-foreground px-2">Active Instances</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roleMetrics.map((metrics) => (
                    <tr key={metrics.role} className="hover:bg-muted/30">
                      <td className="py-2"><RoleBadge role={metrics.role} /></td>
                      <td className="text-center py-2">{metrics.activeUsers}</td>
                      <td className="text-center py-2">{metrics.totalUsers}</td>
                      <td className="text-center py-2">{metrics.openTasks}</td>
                      <td className="text-center py-2">{metrics.claimedTasks}</td>
                      <td className="text-center py-2">{metrics.overdueTasks}</td>
                      <td className="text-center py-2">{metrics.activeInstances}</td>
                    </tr>
                  ))}
                  {roleMetrics.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-muted-foreground">
                        No role data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Users</p>
              <Badge variant="secondary" className="ml-auto text-xs">
                {users.filter((user) => user.active).length} active / {users.length} total
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Department</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0">
                            {user.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{user.department}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${user.active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}>
                          {user.active ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Level</Label>
                <Select
                  value={logFilters.level}
                  onValueChange={(value: "all" | LogLevel) => setLogFilters((prev) => ({ ...prev, level: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    {LOG_LEVEL_ORDER.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Channel</Label>
                <Select
                  value={logFilters.channel}
                  onValueChange={(value: string) => setLogFilters((prev) => ({ ...prev, channel: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChannels.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Search</Label>
                <Input
                  className="h-8 text-xs"
                  value={logFilters.search}
                  onChange={(event) => setLogFilters((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="message / requestId / traceId"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Window (minutes)</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={5}
                  max={1440}
                  value={logFilters.sinceMinutes}
                  onChange={(event) => setLogFilters((prev) => ({ ...prev, sinceMinutes: event.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Limit</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={50}
                  max={2000}
                  value={logFilters.limit}
                  onChange={(event) => setLogFilters((prev) => ({ ...prev, limit: event.target.value }))}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={applyLogFilters}>
                  Apply
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={refreshLogs}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
            {logError && <p className="mt-2 text-xs text-destructive">{logError}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Events</p>
              <p className="mt-2 text-2xl font-semibold">{logSummary.total}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Incidents</p>
              <p className="mt-2 text-2xl font-semibold text-red-600">{logSummary.incidents}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Visible Rows</p>
              <p className="mt-2 text-2xl font-semibold">{logEntries.length}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Events by Level</p>
              <ChartContainer
                config={Object.fromEntries(LOG_LEVEL_ORDER.map((level) => [level, { label: level, color: LOG_LEVEL_COLORS[level] }]))}
                className="h-[220px] w-full"
              >
                <BarChart data={levelChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="level" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4}>
                    {levelChartData.map((item) => (
                      <Cell key={item.level} fill={LOG_LEVEL_COLORS[item.level]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Events by Channel</p>
              <ChartContainer config={{ count: { label: "count", color: "#2563eb" } }} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={channelChartData} dataKey="count" nameKey="channel" outerRadius={78}>
                    {channelChartData.map((item, index) => (
                      <Cell key={item.channel} fill={["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0f766e", "#be123c", "#4f46e5", "#0891b2"][index % 8]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Event Timeline</p>
              <ChartContainer config={{ count: { label: "count", color: "#0f766e" } }} className="h-[220px] w-full">
                <LineChart data={timelineChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} minTickGap={24} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Log Stream</p>
              {isLoadingLogs && <p className="text-xs text-muted-foreground">Loading…</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Timestamp</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Level</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Channel</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Message</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Request ID</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Trace ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedLogEntries.map((entry, index) => {
                    const absoluteIndex = (logCurrentPage - 1) * logRowsPerPage + index;
                    const entryKey = getLogEntryKey(entry, absoluteIndex);
                    const viewMode = logFieldViewMode[entryKey] ?? "raw";
                    return (
                    <tr key={entryKey} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`uppercase text-[10px] ${levelBadgeClass[entry.level]}`}>
                          {entry.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{entry.channel}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p>{entry.message}</p>
                          {entry.fields && Object.keys(entry.fields).length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Raw</span>
                              <Toggle
                                pressed={viewMode === "json"}
                                onPressedChange={(pressed) =>
                                  setLogFieldViewMode((prev) => ({
                                    ...prev,
                                    [entryKey]: pressed ? "json" : "raw",
                                  }))
                                }
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                aria-label="Toggle log formatter"
                              >
                                JSON
                              </Toggle>
                            </div>
                          )}
                        </div>
                        {entry.fields && Object.keys(entry.fields).length > 0 && (
                          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] text-muted-foreground">
                            {viewMode === "json" ? formatLogFields(entry) : formatLogFieldsRaw(entry)}
                          </pre>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{entry.requestId ?? "-"}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{entry.traceId ?? "-"}</td>
                    </tr>
                  )})}
                  {!isLoadingLogs && logEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        No log entries found for this filter set.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Rows per page</p>
                <Select
                  value={String(logRowsPerPage)}
                  onValueChange={(value: string) => {
                    setLogRowsPerPage(Number(value));
                    setLogCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_ROWS_PER_PAGE_OPTIONS.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  {pagedLogRange.from}-{pagedLogRange.to} of {logEntries.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setLogCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={logCurrentPage <= 1}
                  >
                    Prev
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Page {logCurrentPage} / {logTotalPages}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setLogCurrentPage((prev) => Math.min(logTotalPages, prev + 1))}
                    disabled={logCurrentPage >= logTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user account and assign role access.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateUser}>
            <div className="space-y-1.5">
              <Label htmlFor="admin-user-name">Full Name</Label>
              <Input
                id="admin-user-name"
                value={createUserForm.name}
                onChange={(event) => setCreateUserForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Alex Carter"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-user-email">Email</Label>
              <Input
                id="admin-user-email"
                type="email"
                value={createUserForm.email}
                onChange={(event) => setCreateUserForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="alex.carter@hospital.org"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin-user-role">Role</Label>
                <Select
                  value={createUserForm.role}
                  onValueChange={(value: Role) => setCreateUserForm((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger id="admin-user-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reception">Reception</SelectItem>
                    <SelectItem value="triage_nurse">Triage Nurse</SelectItem>
                    <SelectItem value="physician">Physician</SelectItem>
                    <SelectItem value="lab">Laboratory</SelectItem>
                    <SelectItem value="radiology">Radiology</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-user-department">Department</Label>
                <Input
                  id="admin-user-department"
                  value={createUserForm.department}
                  onChange={(event) => setCreateUserForm((prev) => ({ ...prev, department: event.target.value }))}
                  placeholder="Emergency"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-user-password">Temporary Password</Label>
              <Input
                id="admin-user-password"
                type="password"
                value={createUserForm.password}
                onChange={(event) => setCreateUserForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="At least 6 characters"
                required
              />
            </div>
            {createUserError && <p className="text-xs text-destructive">{createUserError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateUserOpen(false)}
                disabled={isSubmittingCreateUser}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingCreateUser}>
                {isSubmittingCreateUser ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
