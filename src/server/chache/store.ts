type ZSetMap = Map<string, number>;

export interface RedisStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<number>;
  lpush(key: string, value: string): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  sadd(key: string, value: string): Promise<number>;
  srem(key: string, value: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  zrangeWithScores(key: string, start: number, stop: number): Promise<Array<{ member: string; score: number }>>;
}

const normalizeRange = (length: number, start: number, stop: number): [number, number] => {
  const s = start < 0 ? Math.max(length + start, 0) : Math.min(start, length);
  const eRaw = stop < 0 ? length + stop : stop;
  const e = Math.min(Math.max(eRaw, -1), length - 1);
  return [s, e];
};

export class InMemoryRedisStore implements RedisStore {
  private readonly strings = new Map<string, string>();
  private readonly expiresAt = new Map<string, number>();
  private readonly lists = new Map<string, string[]>();
  private readonly sets = new Map<string, Set<string>>();
  private readonly zsets = new Map<string, ZSetMap>();

  private isExpired(key: string): boolean {
    const deadline = this.expiresAt.get(key);
    if (deadline === undefined) return false;
    if (Date.now() < deadline) return false;
    this.strings.delete(key);
    this.expiresAt.delete(key);
    return true;
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.strings.set(key, value);
    if (typeof ttlSeconds === "number" && ttlSeconds > 0) {
      this.expiresAt.set(key, Date.now() + ttlSeconds * 1000);
      return;
    }
    this.expiresAt.delete(key);
  }

  async del(key: string): Promise<number> {
    const deleted =
      Number(this.strings.delete(key)) +
      Number(this.lists.delete(key)) +
      Number(this.sets.delete(key)) +
      Number(this.zsets.delete(key));
    this.expiresAt.delete(key);
    return deleted > 0 ? 1 : 0;
  }

  async lpush(key: string, value: string): Promise<number> {
    const existing = this.lists.get(key) ?? [];
    existing.unshift(value);
    this.lists.set(key, existing);
    return existing.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const existing = this.lists.get(key) ?? [];
    if (existing.length === 0) return [];
    const [s, e] = normalizeRange(existing.length, start, stop);
    if (s > e) return [];
    return existing.slice(s, e + 1);
  }

  async sadd(key: string, value: string): Promise<number> {
    const set = this.sets.get(key) ?? new Set<string>();
    const before = set.size;
    set.add(value);
    this.sets.set(key, set);
    return set.size > before ? 1 : 0;
  }

  async srem(key: string, value: string): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    const removed = set.delete(value) ? 1 : 0;
    if (set.size === 0) this.sets.delete(key);
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    return Array.from(this.sets.get(key) ?? []);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const zset = this.zsets.get(key) ?? new Map<string, number>();
    const exists = zset.has(member);
    zset.set(member, score);
    this.zsets.set(key, zset);
    return exists ? 0 : 1;
  }

  async zrem(key: string, member: string): Promise<number> {
    const zset = this.zsets.get(key);
    if (!zset) return 0;
    const removed = zset.delete(member) ? 1 : 0;
    if (zset.size === 0) this.zsets.delete(key);
    return removed;
  }

  async zrangeWithScores(key: string, start: number, stop: number): Promise<Array<{ member: string; score: number }>> {
    const zset = this.zsets.get(key);
    if (!zset) return [];
    const sorted = Array.from(zset.entries())
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => (a.score === b.score ? a.member.localeCompare(b.member) : a.score - b.score));
    const [s, e] = normalizeRange(sorted.length, start, stop);
    if (s > e) return [];
    return sorted.slice(s, e + 1);
  }
}
