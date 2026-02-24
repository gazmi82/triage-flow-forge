import { useMemo, useState } from "react";
import { BookOpen, FileText, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type DocPage = {
  id: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string[] }>;
  diagramAreas?: Array<{
    id: string;
    title: string;
    focus: string;
    map: string[];
    details: string[];
  }>;
};

type DocGroup = {
  id: string;
  title: string;
  pages: DocPage[];
};

const DOC_GROUPS: DocGroup[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    pages: [
      {
        id: "project-overview",
        title: "Project Overview",
        summary:
          "HospitalBPM is a role-aware emergency-triage workflow platform that simulates how patient work moves through registration, triage, diagnosis, supporting departments, and completion. It is designed to make process execution explicit, traceable, and testable in a single operational workspace.",
        sections: [
          {
            heading: "Purpose",
            body: [
              "HospitalBPM models emergency department coordination as a workflow system instead of disconnected task lists.",
              "The product converts clinical and operational handoffs into explicit process states, so each role sees what is actionable now and what depends on upstream work.",
              "It combines process visibility (designer projection) with execution controls (task console), so teams can reason about where each patient-related process instance currently sits.",
              "The core objective is operational clarity: who owns the next action, how urgent it is, and which path the process took.",
            ],
          },
          {
            heading: "Who It Serves",
            body: [
              "Supported roles: reception, triage nurse, physician, lab, radiology, and admin.",
              "Reception can start and route intake-related work; triage nurses classify urgency and drive early routing decisions.",
              "Physicians, lab, and radiology receive downstream tasks based on gateway/event decisions and role assignment.",
              "Admin users have full cross-route visibility to inspect definitions, instances, user access, and process health.",
              "Each non-admin user is intentionally constrained to relevant routes/tasks, reducing noise and enforcing role boundaries.",
            ],
          },
          {
            heading: "Business Scope",
            body: [
              "The current implementation is a realistic mock runtime intended to validate business logic and UX before backend hardening.",
              "It already covers task ownership, save/complete flows, branch routing (XOR/AND), SLA pressure, audit timeline generation, and saved history views.",
              "The system supports instance-scoped graph rendering, ensuring one patient instance cannot pollute another process visualization.",
              "Data contracts and API modules are separated by domain (`read`, `task`, `designer`, `auth`) to support future replacement with real services.",
            ],
          },
          {
            heading: "Operating Model",
            body: [
              "Task Console is the execution control plane: users claim, edit, complete, and route work.",
              "Designer is a process-observability surface: it projects runtime state as a BPMN-like graph for review and debugging.",
              "Saved Tasks and Instances provide longitudinal process context, while Admin surfaces structural controls.",
              "Together, these areas form a closed loop: execute work, project flow, verify outcomes, and iterate definitions.",
            ],
          },
          {
            heading: "Why This Matters",
            body: [
              "Emergency workflows fail when ownership is ambiguous or process state is hidden.",
              "By encoding routing and urgency rules into deterministic task transitions, HospitalBPM makes handoffs auditable and less error-prone.",
              "The platform creates a shared operational language across departments, which improves coordination under time pressure.",
            ],
          },
        ],
      },
      {
        id: "architecture-snapshot",
        title: "Architecture Snapshot",
        summary: "High-level structure of UI, state, and mock API domains.",
        sections: [
          {
            heading: "Frontend",
            body: [
              "React + TypeScript + Vite with shadcn/ui and Tailwind for interface layout.",
              "React Flow renders a read-only process projection for instance context.",
            ],
          },
          {
            heading: "State and Data",
            body: [
              "Redux Toolkit stores auth, workflow graph, instances, tasks, and saved records.",
              "React Query bootstraps data from a modular mock API split by domain.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "workflows",
    title: "Workflow Engine",
    pages: [
      {
        id: "task-console-flow",
        title: "Task Console Flow",
        summary: "How tasks are claimed, completed, and routed with instance-safe graph updates.",
        sections: [
          {
            heading: "Execution Path",
            body: [
              "Task Console is the primary execution surface for runtime work.",
              "A user can claim a pending task, edit form values, and complete the task with routing options.",
              "On completion, workflow thunks create node/task output and write audit events in a single state transition path.",
              "The selected task context controls patient identifiers and form value carry-forward to generated downstream tasks.",
            ],
          },
          {
            heading: "Gateway Rules",
            body: [
              "AND gateway creates two parallel user-task branches when branch roles are provided.",
              "XOR gateway creates one branch based on selected condition and role mapping.",
              "Non-userTask intermediary nodes can still auto-produce a next user task for operational continuity.",
              "End event closes the flow path and contributes to instance completion once no open tasks remain.",
            ],
          },
          {
            heading: "Business Outcomes",
            body: [
              "Operational users never have to edit raw graph state directly.",
              "Routing decisions are captured as deterministic task mutations, making audits and replay easier.",
              "Role ownership and SLA urgency remain aligned with triage attributes through each transition.",
            ],
          },
        ],
        diagramAreas: [
          {
            id: "a1",
            title: "Diagram Area A1: Task Lifecycle",
            focus: "State transition of one task from creation to completion.",
            map: [
              "[pending] --claim--> [claimed] --save edits--> [claimed]",
              "[claimed] --complete--> [completed] --spawn--> [next pending task]",
            ],
            details: [
              "Claim action stamps actor and updates runtime task ownership.",
              "Save edits persists form values and triage adjustments without closing the task.",
              "Complete action archives the current task and creates next node/task based on selected node type.",
            ],
          },
          {
            id: "a2",
            title: "Diagram Area A2: Gateway Split",
            focus: "How one completion event forks to one or many tasks.",
            map: [
              "userTask -> xorGateway -> (critical) physician_task",
              "                      -> (non_critical) triage_nurse_task",
              "userTask -> andGateway -> lab_task + radiology_task",
            ],
            details: [
              "XOR path uses selected condition expression and creates exactly one downstream branch.",
              "AND path creates two explicit branches and keeps both open until independently completed.",
            ],
          },
          {
            id: "a3",
            title: "Diagram Area A3: SLA + Priority Derivation",
            focus: "How urgency impacts execution pressure.",
            map: [
              "triageColor -> triageCategory -> priority -> slaMinutes -> dueAt",
              "red/orange/yellow/green/blue -> urgent/non_urgent -> critical..low",
            ],
            details: [
              "Changing triage color recalculates SLA and can reset due time according to policy.",
              "This keeps visual urgency badges consistent with task sorting and overdue detection.",
            ],
          },
        ],
      },
      {
        id: "designer-projection",
        title: "Designer Projection",
        summary: "How process graphs reflect runtime state while staying instance-isolated.",
        sections: [
          {
            heading: "Projection Model",
            body: [
              "Designer is a runtime projection, not the primary editing surface for tasks.",
              "Graph views are scoped by instance id to avoid cross-instance contamination.",
              "Opening Designer from a task redirects into the exact process context tied to that task instance.",
            ],
          },
          {
            heading: "Node Types",
            body: [
              "Supported subset: start, end, userTask, xorGateway, andGateway, timer/message/signal events.",
              "Sequence flow is the active connector type in the current implementation.",
            ],
          },
          {
            heading: "Behavior Guarantees",
            body: [
              "Task status updates in console are mirrored to node runtime state in projection.",
              "Publishing/loading draft states updates the graph while preserving typed structure.",
            ],
          },
        ],
        diagramAreas: [
          {
            id: "b1",
            title: "Diagram Area B1: Source of Truth",
            focus: "Read/write boundaries between runtime data and visual graph.",
            map: [
              "Task Console (write) ---> workflow state ---> Designer (read projection)",
              "Saved Task Redirect ---> load instance graph ---> focused designer view",
            ],
            details: [
              "Primary business mutations happen through task actions, not manual node dragging.",
              "Designer emphasizes visibility and debugging of process progression.",
            ],
          },
          {
            id: "b2",
            title: "Diagram Area B2: Instance Isolation",
            focus: "Guarantee that one patient instance does not leak into another graph.",
            map: [
              "instance A tasks -> projected nodes A",
              "instance B tasks -> projected nodes B",
              "open task from A => render A only",
            ],
            details: [
              "Merging logic groups by instance id before rendering.",
              "This avoids incorrect branch joins and false task visibility across patients.",
            ],
          },
        ],
      },
      {
        id: "business-logic-deep-dive",
        title: "Business Logic Deep Dive",
        summary: "Detailed rules that drive runtime behavior, routing correctness, and auditability.",
        sections: [
          {
            heading: "Rule Set 1: Ownership and Visibility",
            body: [
              "Tasks appear based on role match or direct assignee match; admin has global visibility.",
              "Saved and live task records are merged by task id so completed history is not dropped.",
              "If a selected task disappears from visible scope, UI clears selection to prevent stale actions.",
            ],
          },
          {
            heading: "Rule Set 2: Completion and Continuation",
            body: [
              "Completing a task can trigger downstream creation with inherited patient and form context.",
              "Gateway and event node behavior determines whether one, many, or no user tasks are created.",
              "Routing metadata is captured in audit timeline for historical explanation of branch choices.",
            ],
          },
          {
            heading: "Rule Set 3: Data Integrity",
            body: [
              "Workflow state normalizes API payloads and applies typed thunks for safer reducer handling.",
              "Mock API state modules isolate read/designer/task/auth concerns for maintainable evolution.",
              "This separation is deliberate groundwork for replacing mock layers with backend services.",
            ],
          },
        ],
        diagramAreas: [
          {
            id: "c1",
            title: "Diagram Area C1: End-to-End Runtime Loop",
            focus: "Closed loop from user action to updated UI state.",
            map: [
              "User action -> thunk -> mock API mutation -> Redux update -> UI rerender",
              "                           |-> audit append -> timeline visibility",
            ],
            details: [
              "Every important action should be representable in audit history.",
              "UI reads from centralized state, preventing page-local truth divergence.",
            ],
          },
          {
            id: "c2",
            title: "Diagram Area C2: Task + Graph Sync",
            focus: "Bi-directional consistency between task list and process graph semantics.",
            map: [
              "create task from console => add node + edge projection",
              "complete task => mark node completed + append downstream node(s)",
            ],
            details: [
              "Graph is visual proof of work progression and branch decisions.",
              "Task list remains the operational queue while graph remains the process map.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    pages: [
      {
        id: "key-folders",
        title: "Key Folders",
        summary: "Fast rehydrate map when session history is unavailable.",
        sections: [
          {
            heading: "Read First",
            body: [
              "PROJECT_MEMORY.md",
              "workflow.definition.json",
              "src/App.tsx",
              "src/store/slices/workflowSlice.ts",
              "src/data/workflow-logic/",
              "src/data/api/",
            ],
          },
          {
            heading: "Then Review",
            body: [
              "src/pages/Tasks.tsx",
              "src/components/designer/",
              "src/pages/SavedTasks.tsx",
              "src/pages/Docs.tsx",
              "src/test/",
            ],
          },
        ],
      },
      {
        id: "update-rhythm",
        title: "Update Rhythm",
        summary: "How project memory should be maintained.",
        sections: [
          {
            heading: "Cadence",
            body: [
              "Update PROJECT_MEMORY.md and documentation content every 5 commits on main.",
              "Update Docs page content when routing logic, task lifecycle rules, or data contracts change.",
              "Append the new checkpoint with commit hashes, concise changes, and outcome.",
            ],
          },
          {
            heading: "Quality Bar",
            body: [
              "Keep notes behavior-focused and avoid aspirational language.",
              "Mention fixes/regressions explicitly when they affect runtime behavior.",
            ],
          },
        ],
      },
    ],
  },
];

const ALL_PAGES = DOC_GROUPS.flatMap((group) => group.pages);

export default function Docs() {
  const [query, setQuery] = useState("");
  const [selectedPageId, setSelectedPageId] = useState<string>("project-overview");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return DOC_GROUPS;
    return DOC_GROUPS.map((group) => ({
      ...group,
      pages: group.pages.filter(
        (page) =>
          page.title.toLowerCase().includes(normalizedQuery) ||
          page.summary.toLowerCase().includes(normalizedQuery) ||
          page.sections.some(
            (section) =>
              section.heading.toLowerCase().includes(normalizedQuery) ||
              section.body.some((line) => line.toLowerCase().includes(normalizedQuery)),
          ) ||
          page.diagramAreas?.some(
            (area) =>
              area.title.toLowerCase().includes(normalizedQuery) ||
              area.focus.toLowerCase().includes(normalizedQuery) ||
              area.map.some((line) => line.toLowerCase().includes(normalizedQuery)) ||
              area.details.some((line) => line.toLowerCase().includes(normalizedQuery)),
          ),
      ),
    })).filter((group) => group.pages.length > 0);
  }, [normalizedQuery]);

  const selectedPage =
    ALL_PAGES.find((page) => page.id === selectedPageId) ??
    filteredGroups[0]?.pages[0] ??
    ALL_PAGES[0];

  return (
    <div className="h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-r border-slate-800 bg-slate-900/60 lg:block">
          <div className="border-b border-slate-800 p-4">
            <div className="mb-3 flex items-center gap-2 text-sky-300">
              <BookOpen className="h-4 w-4" />
              <p className="text-sm font-semibold tracking-wide">Software Docs</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search docs..."
                className="h-9 border-slate-700 bg-slate-900 pl-9 text-xs text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100%-90px)]">
            <div className="p-3">
              <Accordion type="multiple" defaultValue={DOC_GROUPS.map((group) => group.id)} className="space-y-2">
                {filteredGroups.map((group) => (
                  <AccordionItem key={group.id} value={group.id} className="rounded-md border border-slate-800 bg-slate-900/40 px-2">
                    <AccordionTrigger className="py-3 text-sm font-semibold text-slate-100 hover:no-underline">
                      {group.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                      <div className="space-y-1">
                        {group.pages.map((page) => (
                          <button
                            key={page.id}
                            type="button"
                            onClick={() => setSelectedPageId(page.id)}
                            className={cn(
                              "w-full rounded-md px-2 py-2 text-left text-xs transition-colors",
                              selectedPage.id === page.id
                                ? "bg-sky-500/20 text-sky-200"
                                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
                            )}
                          >
                            <p className="font-medium">{page.title}</p>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {filteredGroups.length === 0 && (
                <p className="px-1 py-4 text-xs text-slate-400">No docs matched your search.</p>
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="h-full overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
            <div className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-sky-300">
              <FileText className="h-3.5 w-3.5" />
              Reference
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{selectedPage.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{selectedPage.summary}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-200">
                HospitalBPM
              </Badge>
              <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-200">
                Live Documentation
              </Badge>
            </div>

            <div className="mt-8 space-y-4">
              {selectedPage.sections.map((section) => (
                <section key={section.heading} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
                  <ul className="mt-3 space-y-2">
                    {section.body.map((line) => (
                      <li key={line} className="text-sm leading-relaxed text-slate-300">
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {selectedPage.diagramAreas && selectedPage.diagramAreas.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-white">Diagram Areas</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Each area describes a business-logic region and the expected runtime behavior.
                </p>
                <div className="mt-4 space-y-4">
                  {selectedPage.diagramAreas.map((area) => (
                    <section key={area.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
                      <h3 className="text-base font-semibold text-sky-200">{area.title}</h3>
                      <p className="mt-1 text-sm text-slate-300">{area.focus}</p>
                      <pre className="mt-3 overflow-x-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-200">
                        {area.map.join("\n")}
                      </pre>
                      <ul className="mt-3 space-y-2">
                        {area.details.map((detail) => (
                          <li key={detail} className="text-sm leading-relaxed text-slate-300">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
