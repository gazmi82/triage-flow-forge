import { useMemo } from "react";
import type { AuditEvent, AuthPayload, Role, User } from "@/data/contracts";
import { useAuth } from "@/hooks";
import { useAppSelector } from "@/store/hooks";
import type {
  ProfileActivityDay,
  ProfileEventBreakdown,
  ProfilePatientActivity,
  ProfilePriorityDistribution,
  ProfileTriageDistribution,
  TaskLike,
} from "@/features/profile/types";

const toDayKey = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export interface ProfileAnalytics {
  user: AuthPayload | null;
  currentUser: User | null;
  profileRole: Role | null;
  initials: string;
  personalTasks: TaskLike[];
  personalAudit: AuditEvent[];
  peerUsers: User[];
  patientActivity: ProfilePatientActivity[];
  eventBreakdown: ProfileEventBreakdown[];
  activityByDay: ProfileActivityDay[];
  priorityDistribution: ProfilePriorityDistribution;
  triageDistribution: ProfileTriageDistribution;
  completedCount: number;
  claimedCount: number;
  pendingCount: number;
  overdueCount: number;
  openWorkload: number;
  completionRate: number;
  avgCycleMinutes: number;
  slaRiskCount: number;
  activeInstanceCount: number;
  activityScore: number;
  firstAudit: AuditEvent | null;
  lastAudit: AuditEvent | null;
}

export function useProfileAnalytics(): ProfileAnalytics {
  const { user } = useAuth();
  const users = useAppSelector((state) => state.workflow.users);
  const tasks = useAppSelector((state) => state.workflow.tasks);
  const savedTasks = useAppSelector((state) => state.workflow.savedTasks);
  const audit = useAppSelector((state) => state.workflow.audit);
  const instances = useAppSelector((state) => state.workflow.instances);

  const currentUser = useMemo(() => {
    if (!user) return null;
    return users.find((entry) => entry.id === user.id || entry.email === user.email) ?? null;
  }, [user, users]);

  const personalTasks = useMemo(() => {
    if (!user) return [] as TaskLike[];
    const merged = new Map<string, TaskLike>();

    [...savedTasks, ...tasks].forEach((task) => {
      const roleMatch = task.role === user.role;
      const assigneeMatch = (task.assignee ?? "").toLowerCase() === user.name.toLowerCase();
      if (!roleMatch && !assigneeMatch) return;
      merged.set(task.id, task);
    });

    return [...merged.values()].sort((a, b) => {
      const aMs = new Date(a.updatedAt ?? a.createdAt).getTime();
      const bMs = new Date(b.updatedAt ?? b.createdAt).getTime();
      return bMs - aMs;
    });
  }, [savedTasks, tasks, user]);

  const personalAudit = useMemo(() => {
    if (!user) return [] as AuditEvent[];
    return [...audit]
      .filter((event) => event.actor === user.name || event.role === user.role)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [audit, user]);

  const nowMs = Date.now();
  const completedCount = personalTasks.filter((task) => task.status === "completed").length;
  const claimedCount = personalTasks.filter((task) => task.status === "claimed").length;
  const pendingCount = personalTasks.filter((task) => task.status === "pending").length;
  const overdueCount = personalTasks.filter((task) => {
    if (task.status === "completed") return false;
    if (task.status === "overdue") return true;
    return new Date(task.dueAt).getTime() < nowMs;
  }).length;
  const openWorkload = claimedCount + pendingCount + overdueCount;
  const completionRate = personalTasks.length > 0 ? Math.round((completedCount / personalTasks.length) * 100) : 0;

  const avgCycleMinutes = useMemo(() => {
    const samples = personalTasks
      .filter((task) => task.status === "completed")
      .map((task) => {
        const start = new Date(task.createdAt).getTime();
        const end = new Date(task.updatedAt ?? task.dueAt).getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
        return Math.round((end - start) / 60000);
      })
      .filter((value): value is number => value !== null);

    if (samples.length === 0) return 0;
    return Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
  }, [personalTasks]);

  const slaRiskCount = personalTasks.filter((task) => {
    if (task.status === "completed") return false;
    const dueMs = new Date(task.dueAt).getTime();
    if (Number.isNaN(dueMs)) return false;
    const mins = Math.round((dueMs - nowMs) / 60000);
    return mins > 0 && mins <= 15;
  }).length;

  const activeInstanceCount = useMemo(() => {
    const personalInstanceIds = new Set(personalTasks.map((task) => task.instanceId));
    return instances.filter((instance) => personalInstanceIds.has(instance.id) && instance.status === "active").length;
  }, [instances, personalTasks]);

  const eventBreakdown = useMemo(() => {
    const counts = personalAudit.reduce<Record<AuditEvent["eventType"], number>>(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
        return acc;
      },
      {
        instance_started: 0,
        task_created: 0,
        task_claimed: 0,
        task_completed: 0,
        timer_fired: 0,
        message_received: 0,
        signal_received: 0,
        gateway_passed: 0,
      }
    );

    return Object.entries(counts)
      .map(([eventType, count]) => ({ eventType: eventType as AuditEvent["eventType"], count }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [personalAudit]);

  const activityByDay = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString([], { weekday: "short" }),
        count: 0,
      };
    });

    const index = new Map(days.map((day, position) => [day.key, position]));
    personalAudit.forEach((event) => {
      const key = toDayKey(event.timestamp);
      const position = index.get(key);
      if (position === undefined) return;
      days[position].count += 1;
    });

    return days;
  }, [personalAudit]);

  const priorityDistribution = useMemo(() => {
    const counts: ProfilePriorityDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    personalTasks.forEach((task) => {
      counts[task.priority] += 1;
    });
    return counts;
  }, [personalTasks]);

  const triageDistribution = useMemo(() => {
    const counts: ProfileTriageDistribution = {
      red: 0,
      orange: 0,
      yellow: 0,
      green: 0,
      blue: 0,
    };
    personalTasks.forEach((task) => {
      if (task.triageColor) counts[task.triageColor] += 1;
    });
    return counts;
  }, [personalTasks]);

  const patientActivity = useMemo(() => {
    const map = new Map<string, ProfilePatientActivity>();
    personalTasks.forEach((task) => {
      const key = task.patientId || task.id;
      const latestTouch = task.updatedAt ?? task.createdAt;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          patientId: task.patientId,
          patientName: task.patientName,
          instanceId: task.instanceId,
          latestStatus: task.status,
          priority: task.priority,
          triageColor: task.triageColor,
          latestTouch,
          touchCount: 1,
        });
        return;
      }

      const existingMs = new Date(existing.latestTouch).getTime();
      const nextMs = new Date(latestTouch).getTime();
      if (nextMs > existingMs) {
        existing.latestStatus = task.status;
        existing.priority = task.priority;
        existing.triageColor = task.triageColor;
        existing.latestTouch = latestTouch;
      }
      existing.touchCount += 1;
    });

    return [...map.values()]
      .sort((a, b) => new Date(b.latestTouch).getTime() - new Date(a.latestTouch).getTime())
      .slice(0, 8);
  }, [personalTasks]);

  const peerUsers = useMemo(() => {
    if (!user) return [];
    return users
      .filter((entry) => entry.role === user.role && entry.id !== user.id)
      .sort((a, b) => Number(b.active) - Number(a.active));
  }, [user, users]);

  const firstAudit = personalAudit.length > 0 ? personalAudit[personalAudit.length - 1] : null;
  const lastAudit = personalAudit.length > 0 ? personalAudit[0] : null;
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "NA";

  const activityScore = Math.min(100, Math.round((completionRate * 0.7) + Math.max(0, 30 - overdueCount * 4)));

  return {
    user,
    currentUser,
    profileRole: user?.role ?? null,
    initials,
    personalTasks,
    personalAudit,
    peerUsers,
    patientActivity,
    eventBreakdown,
    activityByDay,
    priorityDistribution,
    triageDistribution,
    completedCount,
    claimedCount,
    pendingCount,
    overdueCount,
    openWorkload,
    completionRate,
    avgCycleMinutes,
    slaRiskCount,
    activeInstanceCount,
    activityScore,
    firstAudit,
    lastAudit,
  };
}
