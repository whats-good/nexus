import type { Chain } from "@src/chain";

export type CannedResponseFn<P, R> = (params: { chain: Chain; params: P }) => R;

export type CannedResponseExecutionResult<R> =
  | {
      kind: "success";
      result: R;
    }
  | {
      kind: "no-canned-response";
    };
