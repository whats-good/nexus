import { NextFn } from "@src/middleware";
import { NexusContext } from "../rpc/nexus-context";
import { RpcErrorResponse, RpcSuccessResponse } from "../rpc/rpc-response";
import { CacheReadDeniedEvent } from "./cache-handler";

export const cacheMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>,
  next: NextFn
) => {
  const { logger, cacheHandler } = context.config;
  logger.debug("cache middleware");
  const { request, eventBus } = context;

  if (cacheHandler) {
    const cacheResult = await cacheHandler.handleRead(context);

    if (cacheResult.kind === "success-result") {
      return context.respond(
        new RpcSuccessResponse(request.getResponseId(), cacheResult.result)
      );
    } else if (cacheResult.kind === "legal-error-result") {
      return context.respond(
        RpcErrorResponse.fromErrorResponsePayload(
          cacheResult.error,
          request.getResponseId()
        )
      );
    }
  } else {
    logger.debug("no cache handler configured. will not schedule cache-read.");
    eventBus.emit(new CacheReadDeniedEvent());
  }

  await next();
};
