export type Role = "reception" | "triage_nurse" | "physician" | "lab" | "radiology" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  active: boolean;
}

export interface ProcessDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  status: "draft" | "published" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  lanes: Role[];
  instanceCount: number;
}

export interface ProcessInstance {
  id: string;
  definitionId: string;
  definitionName: string;
  status: "active" | "completed" | "suspended" | "error";
  startedAt: string;
  startedBy: string;
  currentNode: string;
  priority: "low" | "medium" | "high" | "critical";
  patientId?: string;
  patientName?: string;
}

export interface Task {
  id: string;
  instanceId: string;
  definitionName: string;
  name: string;
  assignee: string | null;
  role: Role;
  status: "pending" | "claimed" | "completed" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  dueAt: string;
  slaMinutes: number;
  minutesRemaining: number;
  patientName: string;
  patientId: string;
  formFields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "number" | "textarea" | "boolean";
  required: boolean;
  options?: string[];
}

export interface AuditEvent {
  id: string;
  instanceId: string;
  timestamp: string;
  actor: string;
  role: Role;
  eventType: "instance_started" | "task_created" | "task_claimed" | "task_completed" | "timer_fired" | "signal_received" | "gateway_passed";
  nodeId: string;
  nodeName: string;
  payload?: Record<string, unknown>;
}

export const MOCK_USERS: User[] = [
  { id: "u1", name: "Maria Santos", email: "m.santos@hospital.org", role: "reception", department: "Emergency", active: true },
  { id: "u2", name: "James Okafor", email: "j.okafor@hospital.org", role: "triage_nurse", department: "Emergency", active: true },
  { id: "u3", name: "Dr. Emily Chen", email: "e.chen@hospital.org", role: "physician", department: "Emergency", active: true },
  { id: "u4", name: "Carlos Rivera", email: "c.rivera@hospital.org", role: "lab", department: "Laboratory", active: true },
  { id: "u5", name: "Priya Nair", email: "p.nair@hospital.org", role: "radiology", department: "Radiology", active: true },
  { id: "u6", name: "Admin User", email: "admin@hospital.org", role: "admin", department: "IT", active: true },
  { id: "u7", name: "Sarah Kim", email: "s.kim@hospital.org", role: "triage_nurse", department: "Emergency", active: true },
  { id: "u8", name: "Dr. Marcus Webb", email: "m.webb@hospital.org", role: "physician", department: "ICU", active: false },
];

export const MOCK_DEFINITIONS: ProcessDefinition[] = [
  {
    id: "def1",
    key: "emergency_triage",
    name: "Emergency Triage",
    version: 3,
    status: "published",
    createdBy: "Admin User",
    createdAt: "2024-11-15T09:00:00Z",
    updatedAt: "2024-12-02T14:30:00Z",
    description: "Standard emergency department triage workflow from patient arrival to physician assessment.",
    lanes: ["reception", "triage_nurse", "physician"],
    instanceCount: 142,
  },
  {
    id: "def2",
    key: "lab_order_processing",
    name: "Lab Order Processing",
    version: 2,
    status: "published",
    createdBy: "Dr. Emily Chen",
    createdAt: "2024-10-20T11:00:00Z",
    updatedAt: "2024-11-28T09:15:00Z",
    description: "Laboratory test ordering, sample collection, processing, and result delivery.",
    lanes: ["physician", "lab"],
    instanceCount: 387,
  },
  {
    id: "def3",
    key: "imaging_request",
    name: "Imaging Request",
    version: 1,
    status: "published",
    createdBy: "Admin User",
    createdAt: "2024-12-01T08:00:00Z",
    updatedAt: "2024-12-01T08:00:00Z",
    description: "Radiology imaging request from physician order to report delivery.",
    lanes: ["physician", "radiology"],
    instanceCount: 58,
  },
  {
    id: "def4",
    key: "bed_assignment",
    name: "Bed Assignment",
    version: 1,
    status: "draft",
    createdBy: "Admin User",
    createdAt: "2024-12-10T10:00:00Z",
    updatedAt: "2024-12-10T10:00:00Z",
    description: "Patient bed assignment and ward transfer workflow.",
    lanes: ["reception", "triage_nurse"],
    instanceCount: 0,
  },
];

export const MOCK_INSTANCES: ProcessInstance[] = [
  { id: "pi-001", definitionId: "def1", definitionName: "Emergency Triage", status: "active", startedAt: "2024-12-19T08:12:00Z", startedBy: "Maria Santos", currentNode: "Physician Assessment", priority: "critical", patientId: "P-3821", patientName: "John Doe" },
  { id: "pi-002", definitionId: "def2", definitionName: "Lab Order Processing", status: "active", startedAt: "2024-12-19T07:45:00Z", startedBy: "Dr. Emily Chen", currentNode: "Sample Analysis", priority: "high", patientId: "P-3819", patientName: "Alice Johnson" },
  { id: "pi-003", definitionId: "def1", definitionName: "Emergency Triage", status: "active", startedAt: "2024-12-19T08:55:00Z", startedBy: "Maria Santos", currentNode: "Vital Signs Check", priority: "medium", patientId: "P-3822", patientName: "Robert Chen" },
  { id: "pi-004", definitionId: "def3", definitionName: "Imaging Request", status: "active", startedAt: "2024-12-19T06:30:00Z", startedBy: "Dr. Marcus Webb", currentNode: "Scan Acquisition", priority: "high", patientId: "P-3810", patientName: "Susan Park" },
  { id: "pi-005", definitionId: "def1", definitionName: "Emergency Triage", status: "completed", startedAt: "2024-12-19T05:00:00Z", startedBy: "Maria Santos", currentNode: "End", priority: "medium", patientId: "P-3815", patientName: "David Lee" },
  { id: "pi-006", definitionId: "def2", definitionName: "Lab Order Processing", status: "error", startedAt: "2024-12-19T04:00:00Z", startedBy: "Dr. Emily Chen", currentNode: "Result Delivery", priority: "high", patientId: "P-3817", patientName: "Emma Wilson" },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "t1", instanceId: "pi-001", definitionName: "Emergency Triage", name: "Physician Assessment",
    assignee: null, role: "physician", status: "pending", priority: "critical",
    createdAt: "2024-12-19T08:30:00Z", dueAt: "2024-12-19T09:00:00Z", slaMinutes: 30, minutesRemaining: 8,
    patientName: "John Doe", patientId: "P-3821",
    formFields: [
      { id: "diagnosis", label: "Primary Diagnosis", type: "text", required: true },
      { id: "severity", label: "Severity Level", type: "select", required: true, options: ["1 - Critical", "2 - Emergent", "3 - Urgent", "4 - Less Urgent", "5 - Non-Urgent"] },
      { id: "notes", label: "Clinical Notes", type: "textarea", required: false },
      { id: "admit", label: "Admit to Hospital", type: "boolean", required: true },
    ]
  },
  {
    id: "t2", instanceId: "pi-003", definitionName: "Emergency Triage", name: "Vital Signs Check",
    assignee: "James Okafor", role: "triage_nurse", status: "claimed", priority: "medium",
    createdAt: "2024-12-19T09:00:00Z", dueAt: "2024-12-19T09:30:00Z", slaMinutes: 30, minutesRemaining: 22,
    patientName: "Robert Chen", patientId: "P-3822",
    formFields: [
      { id: "bp_sys", label: "Blood Pressure (Systolic)", type: "number", required: true },
      { id: "bp_dia", label: "Blood Pressure (Diastolic)", type: "number", required: true },
      { id: "heart_rate", label: "Heart Rate (bpm)", type: "number", required: true },
      { id: "temp", label: "Temperature (°C)", type: "number", required: true },
      { id: "spo2", label: "SpO2 (%)", type: "number", required: true },
    ]
  },
  {
    id: "t3", instanceId: "pi-002", definitionName: "Lab Order Processing", name: "Sample Analysis",
    assignee: "Carlos Rivera", role: "lab", status: "claimed", priority: "high",
    createdAt: "2024-12-19T08:00:00Z", dueAt: "2024-12-19T09:00:00Z", slaMinutes: 60, minutesRemaining: -5,
    patientName: "Alice Johnson", patientId: "P-3819",
    formFields: [
      { id: "wbc", label: "WBC Count", type: "number", required: true },
      { id: "rbc", label: "RBC Count", type: "number", required: true },
      { id: "hemoglobin", label: "Hemoglobin", type: "number", required: true },
      { id: "notes", label: "Analyst Notes", type: "textarea", required: false },
    ]
  },
  {
    id: "t4", instanceId: "pi-004", definitionName: "Imaging Request", name: "Scan Acquisition",
    assignee: "Priya Nair", role: "radiology", status: "overdue", priority: "high",
    createdAt: "2024-12-19T06:45:00Z", dueAt: "2024-12-19T07:45:00Z", slaMinutes: 60, minutesRemaining: -88,
    patientName: "Susan Park", patientId: "P-3810",
    formFields: [
      { id: "scan_type", label: "Scan Type", type: "select", required: true, options: ["CT", "MRI", "X-Ray", "Ultrasound", "PET"] },
      { id: "contrast", label: "Contrast Used", type: "boolean", required: true },
      { id: "findings", label: "Preliminary Findings", type: "textarea", required: false },
    ]
  },
];

export const MOCK_AUDIT: AuditEvent[] = [
  { id: "ae1", instanceId: "pi-001", timestamp: "2024-12-19T08:12:00Z", actor: "Maria Santos", role: "reception", eventType: "instance_started", nodeId: "start1", nodeName: "Patient Arrival", payload: { patientId: "P-3821" } },
  { id: "ae2", instanceId: "pi-001", timestamp: "2024-12-19T08:13:00Z", actor: "System", role: "reception", eventType: "task_created", nodeId: "task1", nodeName: "Registration" },
  { id: "ae3", instanceId: "pi-001", timestamp: "2024-12-19T08:14:00Z", actor: "Maria Santos", role: "reception", eventType: "task_claimed", nodeId: "task1", nodeName: "Registration" },
  { id: "ae4", instanceId: "pi-001", timestamp: "2024-12-19T08:18:00Z", actor: "Maria Santos", role: "reception", eventType: "task_completed", nodeId: "task1", nodeName: "Registration", payload: { patientName: "John Doe", dob: "1975-03-15" } },
  { id: "ae5", instanceId: "pi-001", timestamp: "2024-12-19T08:18:01Z", actor: "System", role: "triage_nurse", eventType: "task_created", nodeId: "task2", nodeName: "Triage Assessment" },
  { id: "ae6", instanceId: "pi-001", timestamp: "2024-12-19T08:20:00Z", actor: "James Okafor", role: "triage_nurse", eventType: "task_claimed", nodeId: "task2", nodeName: "Triage Assessment" },
  { id: "ae7", instanceId: "pi-001", timestamp: "2024-12-19T08:28:00Z", actor: "James Okafor", role: "triage_nurse", eventType: "task_completed", nodeId: "task2", nodeName: "Triage Assessment", payload: { triageLevel: 1, chiefComplaint: "Chest pain" } },
  { id: "ae8", instanceId: "pi-001", timestamp: "2024-12-19T08:28:01Z", actor: "System", role: "physician", eventType: "gateway_passed", nodeId: "gw1", nodeName: "Severity XOR", payload: { path: "critical" } },
  { id: "ae9", instanceId: "pi-001", timestamp: "2024-12-19T08:28:02Z", actor: "System", role: "physician", eventType: "task_created", nodeId: "task3", nodeName: "Physician Assessment" },
  { id: "ae10", instanceId: "pi-001", timestamp: "2024-12-19T08:30:00Z", actor: "System", role: "triage_nurse", eventType: "timer_fired", nodeId: "timer1", nodeName: "SLA 30min Alert", payload: { slaMinutes: 30 } },
];

export const ROLE_LABELS: Record<Role, string> = {
  reception: "Reception",
  triage_nurse: "Triage Nurse",
  physician: "Physician",
  lab: "Laboratory",
  radiology: "Radiology",
  admin: "Administrator",
};

export const ROLE_COLORS: Record<Role, string> = {
  reception: "bg-info/15 text-info border-info/30",
  triage_nurse: "bg-accent/15 text-accent border-accent/30",
  physician: "bg-primary/10 text-primary border-primary/30",
  lab: "bg-warning/15 text-warning border-warning/30",
  radiology: "bg-node-gateway-and/10 text-node-gateway-and border-node-gateway-and/20",
  admin: "bg-muted text-muted-foreground border-border",
};
