import type { Chain } from "@src/chain";

export type RequestFilterFn<P> = (params: {
  params: P;
  chain: Chain;
}) => boolean;

export type RequestFilterExecutionResult =
  | {
      kind: "allow";
    }
  | {
      kind: "deny";
    }
  | {
      kind: "failure";
      error: unknown;
    };
