import type { Chain } from "@src/chain";

export type CannedResponseFn<P, R> = (params: { chain: Chain; params: P }) => R;

export type CannedResponseExecutionResult<R> =
  | {
      kind: "success";
      result: R;
    }
  | {
      kind: "failure";
      error: unknown;
    }
  | {
      kind: "no-canned-response";
    };
