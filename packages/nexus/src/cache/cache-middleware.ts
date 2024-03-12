import type { NextFn } from "@src/middleware";
import type { NexusContext } from "../rpc/nexus-context";
import { RpcErrorResponse, RpcSuccessResponse } from "../rpc/rpc-response";
import { CacheReadDeniedEvent } from "./events";

export const cacheMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>,
  next: NextFn
) => {
  const { logger, cacheHandler } = context.container;

  logger.debug("cache middleware");
  const { request, eventBus } = context;

  if (cacheHandler) {
    const cacheResult = await cacheHandler.handleRead(context);

    if (cacheResult.kind === "success-result") {
      context.respond(
        new RpcSuccessResponse(request.getResponseId(), cacheResult.result)
      );

      return;
    } else if (cacheResult.kind === "legal-error-result") {
      context.respond(
        RpcErrorResponse.fromErrorResponsePayload(
          cacheResult.error,
          request.getResponseId()
        )
      );

      return;
    }
  } else {
    logger.debug("no cache handler configured. will not schedule cache-read.");
    eventBus.emit(new CacheReadDeniedEvent());
  }

  await next();
};
