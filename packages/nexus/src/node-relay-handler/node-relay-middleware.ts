import type { NexusMiddlewareNextFn } from "@src/middleware";
import type { NexusRpcContext } from "@src/dependency-injection";
import { NodeRelayHandler } from "./node-relay-handler";

export const nodeRelayMiddleware = async (
  ctx: NexusRpcContext,
  next: NexusMiddlewareNextFn
): Promise<void> => {
  const nodeRelayHandler = new NodeRelayHandler(ctx);
  const response = await nodeRelayHandler.handle();

  ctx.setResponse(response);

  return next();
};
