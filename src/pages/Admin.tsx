import { useEffect, useMemo, useState } from "react";
import { type Role } from "@/data/contracts";
import { RoleBadge, StatusBadge } from "@/components/ui/Badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { GitBranch, Users, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk, createUserThunk } from "@/store/slices/workflowSlice";
import { ROLE_LABELS } from "@/data/constants";
import { useToast } from "@/hooks";

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
