import { useEffect, useState } from "react";
import { type Role } from "@/data/mockData";
import { RoleBadge, StatusBadge } from "@/components/ui/Badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, Users, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk } from "@/store/slices/workflowSlice";

export default function Admin() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState("definitions");
  const users = useAppSelector((state) => state.workflow.users);
  const definitions = useAppSelector((state) => state.workflow.definitions);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

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
              <Button size="sm" className="ml-auto h-7 text-xs gap-1.5">
                <Plus className="h-3 w-3" />
                New Definition
              </Button>
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
                      <td className="px-4 py-3 font-semibold">{def.instanceCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(def.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-[10px]">Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]">Clone</Button>
                        </div>
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
          {/* Role matrix */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">RBAC Role Permissions</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Lane access matrix for process tasks</p>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-left pb-2 font-semibold text-muted-foreground w-40">Role</th>
                    {["Registration", "Triage", "Assessment", "Lab Orders", "Lab Analysis", "Imaging", "Discharge"].map(p => (
                      <th key={p} className="text-center pb-2 font-semibold text-muted-foreground px-2">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { role: "reception" as Role, perms: [true, false, false, false, false, false, false] },
                    { role: "triage_nurse" as Role, perms: [false, true, false, false, false, false, false] },
                    { role: "physician" as Role, perms: [false, false, true, true, false, true, true] },
                    { role: "lab" as Role, perms: [false, false, false, false, true, false, false] },
                    { role: "radiology" as Role, perms: [false, false, false, false, false, true, false] },
                    { role: "admin" as Role, perms: [true, true, true, true, true, true, true] },
                  ].map(({ role, perms }) => (
                    <tr key={role} className="hover:bg-muted/30">
                      <td className="py-2"><RoleBadge role={role} /></td>
                      {perms.map((p, i) => (
                        <td key={i} className="text-center py-2">
                          {p
                            ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                            : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Users</p>
              <Button size="sm" className="ml-auto h-7 text-xs gap-1.5">
                <Plus className="h-3 w-3" />
                Add User
              </Button>
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
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
