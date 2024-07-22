import type { NexusMiddlewareNextFn } from "@src/middleware";
import type {
  NexusRpcContext,
  StaticContainer,
} from "@src/dependency-injection";
import { NodeRelayHandler } from "./node-relay-handler";

export const nodeRelayMiddleware = async (
  ctx: NexusRpcContext,
  container: StaticContainer,
  next: NexusMiddlewareNextFn
): Promise<void> => {
  const nodeRelayHandler = new NodeRelayHandler(ctx, container);
  const response = await nodeRelayHandler.handle();

  ctx.setResponse(response);

  return next();
};
