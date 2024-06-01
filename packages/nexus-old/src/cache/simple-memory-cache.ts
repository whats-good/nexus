import type { BaseCache, CacheWriteArgs, ReadResult } from "./base-cache";

export class SimpleMemoryCache implements BaseCache {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();

  public async get(key: string): Promise<ReadResult> {
    const entry = this.cache.get(key);

    if (entry === undefined) {
      return { kind: "miss" };
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);

      return { kind: "miss" };
    }

    return { kind: "hit", value: entry.value };
  }
  public async set(args: CacheWriteArgs): Promise<void> {
    this.cache.set(args.key, {
      value: args.value,
      expiresAt: Date.now() + args.ttl,
    });
  }
}
