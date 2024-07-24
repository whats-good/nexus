import type { StaticContainer } from "@src/dependency-injection";
import type { NexusRpcContext } from "@src/nexus-rpc-context";

export type NexusMiddlewareNextFn = () => Promise<void>;

export type NexusMiddleware = (
  ctx: NexusRpcContext,
  container: StaticContainer,
  next: NexusMiddlewareNextFn
) => Promise<void>;
