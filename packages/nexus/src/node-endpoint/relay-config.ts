export type RelayFailureConfig = CycleRequests | FailImmediately;

export interface CycleRequests {
  kind: "cycle-requests";
  maxAttempts: number;
}

// TODO: add a retry option (Retry of the same endpoint)

export interface FailImmediately {
  kind: "fail-immediately";
}

export interface RelayConfig {
  order: "random" | "sequential";
  failure: RelayFailureConfig;
}
