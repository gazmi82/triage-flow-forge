import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriorityBadge, RoleBadge, StatusBadge } from "@/components/ui/Badges";
import { formatTime } from "@/lib/formatters";
import { useAuth } from "@/hooks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk, loadDraftThunk, openTaskDesignerThunk } from "@/store/slices/workflowSlice";
import { FileText, Grid3X3, List, Search } from "lucide-react";

type SortField = "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "cards";
type ProcessStatus = "all" | "open" | "closed";
const isGenericTaskName = (name: string) => /^user task/i.test(name.trim());
const isGeneratedPatientName = (name: string) => /^generated from task console$/i.test(name.trim());

export default function SavedTasks() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const savedTasks = useAppSelector((state) => state.workflow.savedTasks);
  const drafts = useAppSelector((state) => state.workflow.drafts);
  const hasBootstrapped = useAppSelector((state) => state.workflow.hasBootstrapped);
  const isLoading = useAppSelector((state) => state.workflow.isLoading);
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [status, setStatus] = useState<ProcessStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  useEffect(() => {
    if (!hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isLoading]);

  const visibleSavedTasks = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") return savedTasks;
    return savedTasks.filter((task) => task.role === user.role || task.assignee === user.name);
  }, [savedTasks, user]);

  const filtered = useMemo(() => {
    return [...visibleSavedTasks]
      .filter((task) => {
        if (status !== "all" && task.processStatus !== status) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          task.name.toLowerCase().includes(q) ||
          task.patientName.toLowerCase().includes(q) ||
          task.patientId.toLowerCase().includes(q) ||
          task.definitionName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aValue = new Date(a[sortField] ?? a.createdAt).getTime();
        const bValue = new Date(b[sortField] ?? b.createdAt).getTime();
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      });
  }, [query, sortDirection, sortField, status, visibleSavedTasks]);

  const orderedDrafts = useMemo(() => [...drafts].sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [drafts]);

  const openDraft = async (draftId: string) => {
    await dispatch(loadDraftThunk({ draftId }));
    navigate("/designer");
  };

  const redirectTaskProcess = async (taskId: string) => {
    await dispatch(openTaskDesignerThunk({ taskId }));
    navigate("/designer");
  };

  const getTaskTitle = (task: (typeof filtered)[number]) => {
    if (isGenericTaskName(task.name) && !isGeneratedPatientName(task.patientName)) {
      return task.patientName;
    }
    return task.name;
  };

  const getPatientDisplayName = (task: (typeof filtered)[number]) => {
    if (!isGeneratedPatientName(task.patientName)) return task.patientName;
    return "Patient Name Pending";
  };

  const openCount = visibleSavedTasks.filter((task) => task.processStatus === "open").length;
  const closedCount = visibleSavedTasks.filter((task) => task.processStatus === "closed").length;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold">Saved Tasks</h1>
        <p className="text-xs text-muted-foreground">Task history with process status, timestamps, and draft snapshots.</p>
      </div>

      <Tabs defaultValue="saved_tasks">
        <TabsList className="mb-4 h-9">
          <TabsTrigger value="saved_tasks" className="text-xs">Saved Tasks</TabsTrigger>
          <TabsTrigger value="draft" className="text-xs">Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="saved_tasks" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">Total</p><p className="text-2xl font-bold">{visibleSavedTasks.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">Open</p><p className="text-2xl font-bold text-info">{openCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">Closed</p><p className="text-2xl font-bold text-success">{closedCount}</p></CardContent></Card>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search task, patient, process..." className="h-8 pl-8 text-xs" />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as ProcessStatus)}>
              <SelectTrigger className="h-8 w-full text-xs md:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
              <SelectTrigger className="h-8 w-full text-xs md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">created_at</SelectItem>
                <SelectItem value="updatedAt">updated_at</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
              <SelectTrigger className="h-8 w-full text-xs md:w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">asc</SelectItem>
                <SelectItem value="desc">desc</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
              <Button variant={viewMode === "cards" ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode("cards")}><Grid3X3 className="h-4 w-4" /></Button>
            </div>
          </div>

          {viewMode === "table" ? (
            <div className="rounded-lg border bg-card overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Task</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Patient</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Role</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Process</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">created_at</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">updated_at</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((task) => (
                    <tr key={task.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <p className="font-semibold">{getTaskTitle(task)}</p>
                        <p className="text-[10px] text-muted-foreground">{task.definitionName}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p>{getPatientDisplayName(task)}</p>
                        <p className="text-[10px] text-muted-foreground">{task.patientId}</p>
                      </td>
                      <td className="px-3 py-2"><RoleBadge role={task.role} /></td>
                      <td className="px-3 py-2"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-2">
                        <Badge variant={task.processStatus === "open" ? "secondary" : "outline"}>{task.processStatus}</Badge>
                      </td>
                      <td className="px-3 py-2">{formatTime(task.createdAt)}</td>
                      <td className="px-3 py-2">{formatTime(task.updatedAt ?? task.createdAt)}</td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => redirectTaskProcess(task.id)}>
                          Redirect to Process
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((task) => (
                <Card key={task.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{getTaskTitle(task)}</CardTitle>
                    <CardDescription className="text-xs">{task.definitionName}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex gap-1.5"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /><RoleBadge role={task.role} /></div>
                    <p>{getPatientDisplayName(task)} · {task.patientId}</p>
                    <p className="text-muted-foreground">created_at: {formatTime(task.createdAt)}</p>
                    <p className="text-muted-foreground">updated_at: {formatTime(task.updatedAt ?? task.createdAt)}</p>
                    <Badge variant={task.processStatus === "open" ? "secondary" : "outline"}>{task.processStatus}</Badge>
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => redirectTaskProcess(task.id)}>
                      Redirect to Process
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="draft">
          {orderedDrafts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold">No drafts yet</p>
                <p className="text-xs text-muted-foreground">Use Save Draft in Process Designer to create one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {orderedDrafts.map((draft) => (
                <Card key={draft.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm">{draft.name}</CardTitle>
                        <CardDescription className="text-xs">Saved at {formatTime(draft.savedAt)}</CardDescription>
                      </div>
                      <Badge variant="outline">v{draft.version}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{draft.graph.nodes.length} nodes · {draft.graph.edges.length} edges</div>
                    <Button size="sm" onClick={() => openDraft(draft.id)}>Redirect to Process</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
