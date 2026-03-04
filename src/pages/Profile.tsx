import { Activity, Stethoscope, Users } from "lucide-react";
import {
  ActivitySplitSection,
  MetricTilesSection,
  OverviewSplitSection,
  SummaryHeroSection,
  WorkloadSplitSection,
} from "@/components/sections";
import {
  Badge,
  PriorityBadge,
  RoleBadge,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TriageBadge,
} from "@/components/ui";
import { ROLE_LABELS } from "@/data/constants";
import {
  EVENT_ICONS,
  EVENT_LABELS,
  PRIORITIES,
  TRIAGE_COLORS,
  useProfileAnalytics,
} from "@/features/profile";
import { formatDateTime, formatTime, timeAgo } from "@/lib";

export default function Profile() {
  const analytics = useProfileAnalytics();
  const maxActivityCount = Math.max(...analytics.activityByDay.map((item) => item.count), 1);

  return (
    <div className="h-full overflow-y-auto p-6">
      <SummaryHeroSection
        avatarFallback={analytics.initials}
        title={analytics.user?.name ?? "Unknown User"}
        subtitle={analytics.user?.email ?? "No email"}
        badges={
          <>
            {analytics.profileRole ? <RoleBadge role={analytics.profileRole} /> : <Badge variant="outline">Unknown role</Badge>}
            <Badge variant="outline">{analytics.user?.department ?? "No department"}</Badge>
            <Badge variant={analytics.currentUser?.active ? "default" : "secondary"}>
              {analytics.currentUser?.active ? "Active account" : "Inactive account"}
            </Badge>
          </>
        }
        contextTitle="Activity window"
        contextLines={[
          `Last activity: ${analytics.lastAudit ? timeAgo(analytics.lastAudit.timestamp) : "No events yet"}`,
          `Active since: ${analytics.firstAudit ? formatDateTime(analytics.firstAudit.timestamp) : "No audit history"}`,
        ]}
        score={{
          title: "Personal Activity Score",
          description: "Based on completion rate and SLA stability.",
          value: analytics.activityScore,
          maxLabel: "/100",
          progressValue: analytics.activityScore,
          stats: [
            { label: "Audit events", value: analytics.personalAudit.length },
            { label: "Active instances", value: analytics.activeInstanceCount },
          ],
        }}
      />

      <MetricTilesSection
        items={[
          {
            label: "Tasks in scope",
            value: analytics.personalTasks.length,
            description: "Claimed + role queue visibility",
          },
          {
            label: "Open workload",
            value: analytics.openWorkload,
            description: `${analytics.claimedCount} claimed, ${analytics.pendingCount} pending, ${analytics.overdueCount} overdue`,
          },
          {
            label: "Completion rate",
            value: `${analytics.completionRate}%`,
            description: `Avg cycle time: ${analytics.avgCycleMinutes || 0} min`,
          },
          {
            label: "SLA risk watch",
            value: analytics.slaRiskCount,
            description: "Tasks due within 15 minutes",
          },
        ]}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            Activity Tracking
          </TabsTrigger>
          <TabsTrigger value="workload" className="text-xs">
            Workload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewSplitSection
            detailsCard={{
              title: "Identity and Access",
              description: "Profile metadata from current authenticated session.",
              details: [
                { label: "User ID", value: analytics.user?.id ?? "N/A" },
                {
                  label: "Role",
                  value: analytics.profileRole ? ROLE_LABELS[analytics.profileRole] : "N/A",
                },
                { label: "Department", value: analytics.user?.department ?? "N/A" },
                { label: "Account status", value: analytics.currentUser?.active ? "Active" : "Unknown" },
              ],
              highlight: {
                label: "Recent audit marker",
                value: analytics.lastAudit
                  ? `${EVENT_LABELS[analytics.lastAudit.eventType]} · ${formatDateTime(analytics.lastAudit.timestamp)}`
                  : "No audit events captured yet.",
              },
            }}
            listCard={{
              title: "Role Team",
              description: "Other users currently mapped to your same role lane.",
              emptyText: "No peers available for this role yet.",
              items: analytics.peerUsers.slice(0, 6).map((peer) => ({
                id: peer.id,
                title: peer.name,
                subtitle: peer.email,
                statusLabel: peer.active ? "Online-ready" : "Inactive",
                statusVariant: peer.active ? "default" : "secondary",
              })),
            }}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivitySplitSection
            timelineTitle="Personal Timeline"
            timelineDescription="Most recent actions performed by you or your role lane."
            timelineEmptyText="No personal timeline entries yet."
            timelineItems={analytics.personalAudit.slice(0, 12).map((event) => {
              const Icon = EVENT_ICONS[event.eventType] ?? Activity;
              return {
                id: event.id,
                icon: <Icon className="h-3.5 w-3.5 text-primary" />,
                title: EVENT_LABELS[event.eventType],
                subtitle: `${event.nodeName} · ${event.actor}`,
                time: formatTime(event.timestamp),
              };
            })}
            progressTitle="7-day activity"
            progressItems={analytics.activityByDay.map((day) => ({
              key: day.key,
              label: day.label,
              value: day.count,
              progress: Math.round((day.count / maxActivityCount) * 100),
            }))}
            breakdownTitle="Event mix"
            breakdownEmptyText="No event distribution available."
            breakdownItems={analytics.eventBreakdown.map((entry) => ({
              key: entry.eventType,
              label: EVENT_LABELS[entry.eventType],
              value: entry.count,
            }))}
          />
        </TabsContent>

        <TabsContent value="workload">
          <WorkloadSplitSection
            distributionTitle="Priority and Triage Distribution"
            distributionDescription="How your current scope is distributed by urgency and triage category."
            distributionGroups={[
              {
                key: "priority",
                title: "By priority",
                rows: PRIORITIES.map((priority) => {
                  const count = analytics.priorityDistribution[priority];
                  const progress = analytics.personalTasks.length > 0
                    ? Math.round((count / analytics.personalTasks.length) * 100)
                    : 0;
                  return {
                    key: priority,
                    label: <PriorityBadge priority={priority} />,
                    value: count,
                    progress,
                  };
                }),
              },
              {
                key: "triage",
                title: "By triage color",
                rows: TRIAGE_COLORS.map((color) => {
                  const count = analytics.triageDistribution[color];
                  const progress = analytics.personalTasks.length > 0
                    ? Math.round((count / analytics.personalTasks.length) * 100)
                    : 0;
                  return {
                    key: color,
                    label: <TriageBadge triageColor={color} />,
                    value: count,
                    progress,
                  };
                }),
              },
            ]}
            trackingTitle="Patient Tracking"
            trackingDescription="Latest patient items touched in your workflow lane."
            trackingEmptyText="No patient-linked tasks in your current scope."
            trackingItems={analytics.patientActivity.map((patient) => ({
              id: patient.patientId,
              title: patient.patientName,
              status: <StatusBadge status={patient.latestStatus} />,
              subtitle: `${patient.patientId} · ${patient.instanceId}`,
              tags: [
                <PriorityBadge key={`${patient.patientId}-priority`} priority={patient.priority} />,
                patient.triageColor ? (
                  <TriageBadge key={`${patient.patientId}-triage`} triageColor={patient.triageColor} />
                ) : null,
                <Badge key={`${patient.patientId}-touch`} variant="outline">
                  {patient.touchCount} touches
                </Badge>,
                <Badge key={`${patient.patientId}-time`} variant="secondary">
                  {timeAgo(patient.latestTouch)}
                </Badge>,
              ].filter(Boolean),
            }))}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Stethoscope className="h-3.5 w-3.5" />
        <Users className="h-3.5 w-3.5" />
        Data is calculated live from your authenticated role, task state, saved records, instances, and audit events.
      </div>
    </div>
  );
}
