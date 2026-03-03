import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, FileText, HeartPulse, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, RoleBadge, StatusBadge } from "@/components/ui/Badges";
import { appApi } from "@/data/appApi";
import { formatDateTime, formatTime } from "@/lib/formatters";

const NOTES_KEYWORDS = ["note", "assessment", "plan", "finding", "diagnosis", "treatment", "handoff", "summary"];
const MEDICATION_KEYWORDS = ["medication", "drug", "rx", "dose"];
const HISTORY_KEYWORDS = ["history", "allergy", "condition", "surgery", "comorbidity", "chronic"];

const keyMatches = (key: string, keywords: string[]) => {
  const normalized = key.toLowerCase();
  return keywords.some((term) => normalized.includes(term));
};

const formatFieldLabel = (key: string): string =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());

const formatFieldValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "-";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export function PatientMedicalRecordPage() {
  const navigate = useNavigate();
  const { taskId = "" } = useParams();

  const recordQuery = useQuery({
    queryKey: ["patient-medical-record", taskId],
    queryFn: () => appApi.fetchPatientMedicalRecord(taskId),
    enabled: taskId.trim().length > 0,
  });

  const formEntries = useMemo(() => {
    const values = recordQuery.data?.task?.formValues;
    if (!values || typeof values !== "object") return [] as Array<[string, unknown]>;
    return Object.entries(values as Record<string, unknown>).filter(([, value]) => value !== "" && value !== null && value !== undefined);
  }, [recordQuery.data?.task?.formValues]);

  const historyEntries = useMemo(
    () => formEntries.filter(([key]) => keyMatches(key, HISTORY_KEYWORDS)),
    [formEntries]
  );
  const medicationEntries = useMemo(
    () => formEntries.filter(([key]) => keyMatches(key, MEDICATION_KEYWORDS)),
    [formEntries]
  );
  const noteEntries = useMemo(
    () => formEntries.filter(([key]) => keyMatches(key, NOTES_KEYWORDS)),
    [formEntries]
  );

  if (recordQuery.isLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Medical Record</CardTitle>
            <CardDescription>Loading patient record...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (recordQuery.isError || !recordQuery.data) {
    const message = recordQuery.error instanceof Error ? recordQuery.error.message : `No record found for task ${taskId}.`;
    return (
      <div className="h-full overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Medical Record</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/saved-tasks")}>
              Back to Saved Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { task, instance, audit } = recordQuery.data;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Patient Medical Record</h1>
          <p className="text-xs text-muted-foreground">Live backend record for task {task.id}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/saved-tasks">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Saved Tasks
            </Link>
          </Button>
          <Button size="sm" onClick={() => navigate("/tasks")}>
            Open Task Console
          </Button>
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
              <p className="font-medium">{task.patientName || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patient ID</p>
              <p className="font-medium">{task.patientId || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Process / Task</p>
              <p className="font-medium">
                {task.definitionName} · {task.name}
              </p>
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
              <Badge variant="outline">Instance: {instance.id}</Badge>
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
            <p>Current Node: {instance.currentNode || "-"}</p>
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
            {historyEntries.length === 0 ? (
              <p className="text-muted-foreground">No medical history fields captured on this task.</p>
            ) : (
              historyEntries.map(([key, value]) => (
                <p key={key}>
                  <span className="font-medium">{formatFieldLabel(key)}:</span> {formatFieldValue(value)}
                </p>
              ))
            )}
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
            {medicationEntries.length === 0 ? (
              <p className="text-muted-foreground">No medication fields captured on this task.</p>
            ) : (
              medicationEntries.map(([key, value]) => (
                <p key={key}>
                  <span className="font-medium">{formatFieldLabel(key)}:</span> {formatFieldValue(value)}
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {noteEntries.length === 0 ? (
              <p className="text-muted-foreground">No note fields captured on this task.</p>
            ) : (
              noteEntries.map(([key, value]) => (
                <p key={key}>
                  <span className="font-medium">{formatFieldLabel(key)}:</span> {formatFieldValue(value)}
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Audit Timeline</CardTitle>
            <CardDescription>Backend audit events for this process instance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {audit.length === 0 ? (
              <p className="text-muted-foreground">No audit events found.</p>
            ) : (
              audit.slice(0, 20).map((event) => (
                <div key={event.id} className="rounded border border-border px-3 py-2">
                  <p className="font-medium">
                    {event.eventType} · {event.nodeName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.timestamp)} · {event.actor} · {event.role}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
