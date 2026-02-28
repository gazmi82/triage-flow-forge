import { describe, expect, it } from "vitest";
import type { Role } from "@/data/contracts";
import { InMemoryRedisStore } from "@/server/chache/store";
import { WorkflowRedisCache } from "@/server/chache/workflowRedisCache";

describe("WorkflowRedisCache", () => {
  it("stores and reads sessions", async () => {
    const cache = new WorkflowRedisCache(new InMemoryRedisStore());
    await cache.setSession({
      userId: "u6",
      role: "admin",
      issuedAtIso: "2026-02-25T12:00:00.000Z",
      expiresAtIso: "2026-02-25T13:00:00.000Z",
    });

    const session = await cache.getSession("u6");
    expect(session?.role).toBe("admin");
  });

  it("handles role queue, sla zset, and active instances", async () => {
    const cache = new WorkflowRedisCache(new InMemoryRedisStore());
    const role: Role = "triage_nurse";

    await cache.enqueueTask(role, "t-001");
    await cache.enqueueTask(role, "t-002");
    await cache.addSlaDeadline({ taskId: "t-001", deadlineEpochSeconds: 1767225600 });
    await cache.markInstanceActive("pi-001");

    const queue = await cache.getTaskQueue(role);
    const deadlines = await cache.getSlaDeadlines();
    const activeInstances = await cache.getActiveInstances();

    expect(queue).toEqual(["t-002", "t-001"]);
    expect(deadlines).toEqual([{ taskId: "t-001", deadlineEpochSeconds: 1767225600 }]);
    expect(activeInstances).toContain("pi-001");
  });
});
