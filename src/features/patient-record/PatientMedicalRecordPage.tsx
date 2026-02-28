import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, FileText, HeartPulse, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, RoleBadge, StatusBadge } from "@/components/ui/Badges";
import { useAppSelector } from "@/store/hooks";
import { formatTime } from "@/lib/formatters";

const MEDICAL_HISTORY = [
  "Hypertension (controlled)",
  "No known drug allergies",
  "Previous appendectomy (2018)",
];

const CURRENT_MEDICATIONS = [
  "Amlodipine 5mg daily",
  "Acetaminophen 500mg as needed",
];

const TRIAGE_NOTES = [
  "Initial triage completed",
  "Pain score documented",
  "Follow-up action required by assigned role",
];

export function PatientMedicalRecordPage() {
  const navigate = useNavigate();
  const { taskId = "" } = useParams();

  const savedTasks = useAppSelector((state) => state.workflow.savedTasks);

  const task = useMemo(() => savedTasks.find((item) => item.id === taskId), [savedTasks, taskId]);

  if (!task) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Medical Record</CardTitle>
            <CardDescription>No record found for task `{taskId}`.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/saved-tasks")}>Back to Saved Tasks</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Patient Medical Record</h1>
          <p className="text-xs text-muted-foreground">Static frontend view. Backend integration will be added next.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/saved-tasks">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Saved Tasks
            </Link>
          </Button>
          <Button size="sm" onClick={() => navigate("/tasks")}>Open Task Console</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Patient Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Patient Name</p>
              <p className="font-medium">{task.patientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patient ID</p>
              <p className="font-medium">{task.patientId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Process / Task</p>
              <p className="font-medium">{task.definitionName} · {task.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Update</p>
              <p className="font-medium">{formatTime(task.updatedAt ?? task.createdAt)}</p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <RoleBadge role={task.role} />
              <Badge variant="outline">Process: {task.processStatus}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4" />
              Clinical Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Triage Color: {task.triageColor ?? "Not specified"}</p>
            <p>Triage Category: {task.triageCategory ?? "Not specified"}</p>
            <p>SLA Minutes: {task.slaMinutes}</p>
            <p>Due At: {formatTime(task.dueAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Medical History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {MEDICAL_HISTORY.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Current Medications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {CURRENT_MEDICATIONS.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Triage Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {TRIAGE_NOTES.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
