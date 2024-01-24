type ReadResult =
  | {
      kind: "success";
      value: unknown;
    }
  | {
      kind: "not-found";
    }
  | {
      kind: "failure";
      error: unknown;
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
