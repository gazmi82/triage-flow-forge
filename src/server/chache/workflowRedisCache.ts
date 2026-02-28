import type { Role } from "@/data/contracts";
import { redisKeys, type SessionRecord, type SlaDeadlineEntry } from "@/server/chache/contracts";
import type { RedisStore } from "@/server/chache/store";

export class WorkflowRedisCache {
  constructor(private readonly store: RedisStore) {}

  async setSession(record: SessionRecord, ttlSeconds = 3600): Promise<void> {
    await this.store.set(redisKeys.session(record.userId), JSON.stringify(record), ttlSeconds);
  }

  async getSession(userId: string): Promise<SessionRecord | null> {
    const raw = await this.store.get(redisKeys.session(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionRecord;
    } catch {
      return null;
    }
  }

  async clearSession(userId: string): Promise<void> {
    await this.store.del(redisKeys.session(userId));
  }

  async enqueueTask(role: Role, taskId: string): Promise<number> {
    return this.store.lpush(redisKeys.taskQueue(role), taskId);
  }

  async getTaskQueue(role: Role, start = 0, stop = -1): Promise<string[]> {
    return this.store.lrange(redisKeys.taskQueue(role), start, stop);
  }

  async addSlaDeadline(entry: SlaDeadlineEntry): Promise<number> {
    return this.store.zadd(redisKeys.slaDeadlinesZset, entry.deadlineEpochSeconds, entry.taskId);
  }

  async removeSlaDeadline(taskId: string): Promise<number> {
    return this.store.zrem(redisKeys.slaDeadlinesZset, taskId);
  }

  async getSlaDeadlines(start = 0, stop = -1): Promise<SlaDeadlineEntry[]> {
    const records = await this.store.zrangeWithScores(redisKeys.slaDeadlinesZset, start, stop);
    return records.map((record) => ({
      taskId: record.member,
      deadlineEpochSeconds: record.score,
    }));
  }

  async markInstanceActive(instanceId: string): Promise<number> {
    return this.store.sadd(redisKeys.instanceActiveSet, instanceId);
  }

  async unmarkInstanceActive(instanceId: string): Promise<number> {
    return this.store.srem(redisKeys.instanceActiveSet, instanceId);
  }

  async getActiveInstances(): Promise<string[]> {
    return this.store.smembers(redisKeys.instanceActiveSet);
  }
}
