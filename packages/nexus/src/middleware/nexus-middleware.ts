import type { NexusRpcContext } from "@src/dependency-injection";

export type NexusMiddleware<TPlatformContext = unknown> = (
  ctx: NexusRpcContext<TPlatformContext>,
  next: () => Promise<void>
) => Promise<void>;
