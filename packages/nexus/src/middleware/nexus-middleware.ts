import type {
  NexusRpcContext,
  StaticContainer,
} from "@src/dependency-injection";

export type NexusMiddlewareNextFn = () => Promise<void>;

export type NexusMiddleware = (
  ctx: NexusRpcContext,
  container: StaticContainer,
  next: NexusMiddlewareNextFn
) => Promise<void>;
