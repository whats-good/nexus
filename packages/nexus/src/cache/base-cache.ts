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

export interface BaseCache {
  get: (key: string) => Promise<ReadResult>;
  set: (params: { key: string; ttl: number; value: any }) => Promise<void>;
}
