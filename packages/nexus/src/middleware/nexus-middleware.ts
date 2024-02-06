import { NexusContext } from "@src/rpc";

export type NextFn = () => Promise<void>;

export type NexusMiddleware<TServerContext> = (
  context: NexusContext<TServerContext>,
  next: NextFn
) => Promise<void>;

export type NexusMiddlewareArgs<TServerContext> = Parameters<
  NexusMiddleware<TServerContext>
>;
