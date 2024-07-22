import type { NexusRpcContext } from "@src/dependency-injection";

export type NexusMiddlewareNextFn = () => Promise<void>;

export type NexusMiddleware = (
  ctx: NexusRpcContext,
  next: NexusMiddlewareNextFn
) => Promise<void>;
