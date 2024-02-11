export type ReadResult =
  | {
      kind: "hit";
      value: unknown;
    }
  | {
      kind: "miss";
    };

export interface CacheWriteArgs {
  key: string;
  ttl: number;
  value: unknown;
}

export interface BaseCache {
  get: (key: string) => Promise<ReadResult>;
  set: (args: CacheWriteArgs) => Promise<void>;
}
