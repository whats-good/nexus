import type { NexusRpcContext } from "@src/nexus-rpc-context";

export type NexusMiddlewareNextFn = () => Promise<void>;

export type NexusMiddleware = (
  ctx: NexusRpcContext,
  next: NexusMiddlewareNextFn
) => Promise<void>;
