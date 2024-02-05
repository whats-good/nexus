import { RpcContext } from "@src/rpc";

export type NextFn = () => Promise<void>;

export type NexusMiddleware<TServerContext> = (
  context: RpcContext<TServerContext>,
  next: NextFn
) => Promise<void>;

export type NexusMiddlewareArgs<TServerContext> = Parameters<
  NexusMiddleware<TServerContext>
>;
