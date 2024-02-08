import { NextFn } from "@src/middleware";
import { NexusContext } from "./nexus-context";
import { RpcSuccessResponse } from "./rpc-response";

export const cacheMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>,
  next: NextFn
) => {
  const { logger, cacheHandler } = context.config;
  logger.debug("cache middleware");
  const { request } = context;

  if (cacheHandler) {
    const cacheResult = await cacheHandler.handleRead(context);

    if (cacheResult.kind === "success-result") {
      // TODO: right now, only success results are returned.
      // We should allow configurations to specify which errors can be cached and returned.
      return context.respond(
        new RpcSuccessResponse(request.getResponseId(), cacheResult.result)
      );
    }
  }

  await next();
};
