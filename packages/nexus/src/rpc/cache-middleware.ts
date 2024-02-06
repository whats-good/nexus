import { NextFn } from "@src/middleware";
import { NexusContext } from "./nexus-context";
import { RpcSuccessResponse } from "./rpc-response";
import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";

const scheduleCacheWrite = <TServerContext>(
  context: NexusContext<TServerContext>,
  response: RpcSuccessResponse
): void => {
  const { cacheHandler, logger } = context.config;
  if (!cacheHandler) {
    logger.debug("cache is not configured. will not schedule cache-write.");
    return;
  }

  safeAsyncNextTick(
    async () => {
      await cacheHandler
        .handleWrite(context, response.body())
        .then((writeResult) => {
          if (writeResult.kind === "success") {
            logger.info("successfully cached response.");
          } else {
            logger.warn("failed to cache response.");
          }
        });
    },
    (error) => {
      const errorMsg = `Error while caching response: ${safeJsonStringify(
        error
      )}`;
      logger.error(errorMsg);
    }
  );
};

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

  if (
    context.response instanceof RpcSuccessResponse &&
    context.response.isCacheable
  ) {
    logger.debug(
      "response was cacheable. will schedule a cache-write if cache is configured."
    );
    scheduleCacheWrite(context, context.response);
  }
};
