import type { NexusContext } from "@src/rpc";

export type NextFn = () => Promise<void>;

export type NexusMiddleware<TServerContext = unknown> = (
  context: NexusContext<TServerContext>,
  next: NextFn
) => Promise<void>;

export type NexusMiddlewareArgs<TServerContext> = Parameters<
  NexusMiddleware<TServerContext>
>;
