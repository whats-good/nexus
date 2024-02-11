import { BaseCache, CacheWriteArgs, ReadResult } from "./base-cache";

export class SimpleMemoryCache implements BaseCache {
  private cache: Record<string, { value: unknown; expiresAt: number }> = {};
  async get(key: string): Promise<ReadResult> {
    const entry = this.cache[key];
    if (entry === undefined) {
      return { kind: "miss" };
    }
    if (entry.expiresAt < Date.now()) {
      delete this.cache[key];
      return { kind: "miss" };
    }
    return { kind: "hit", value: entry.value };
  }
  async set(args: CacheWriteArgs): Promise<void> {
    this.cache[args.key] = {
      value: args.value,
      expiresAt: Date.now() + args.ttl,
    };
  }
}
