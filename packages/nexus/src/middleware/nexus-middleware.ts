import type { NexusRpcContext } from "@src/dependency-injection";

export type NexusMiddlewareNextFn = () => Promise<void>;

export type NexusMiddleware<TPlatformContext = unknown> = (
  ctx: NexusRpcContext<TPlatformContext>,
  next: NexusMiddlewareNextFn
) => Promise<void>;
