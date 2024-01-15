import type { BaseCache } from "./rpc-request-cache";

export class PlacholderCache implements BaseCache {
  // TODO: replace this with an actual cache library + LRU cache
  private readonly cache = new Map<
    string,
    {
      expiresAt: number;
      payload: unknown;
    }
  >();

  private readonly keys: string[] = [];

  public get(key: string): Promise<unknown> {
    return new Promise((resolve) => {
      const entry = this.cache.get(key);

      if (entry) {
        if (entry.expiresAt < Date.now()) {
          this.cache.delete(key);
          resolve(undefined);
        } else {
          resolve(entry.payload);
        }
      } else {
        resolve(undefined);
      }
    });
  }

  public set({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: unknown;
    ttl: number;
  }): Promise<void> {
    return new Promise((resolve) => {
      if (this.keys.length > 100) {
        const oldKey = this.keys[0];

        this.keys.shift();
        this.cache.delete(oldKey);
      }

      this.keys.push(key);
      this.cache.set(key, {
        expiresAt: Date.now() + ttl,
        payload: value,
      });
      resolve();
    });
  }
}
