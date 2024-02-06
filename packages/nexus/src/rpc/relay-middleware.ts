import { NextFn } from "@src/middleware";
import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import { NexusContext } from "./nexus-context";
import {
  RpcSuccessResponse,
  RpcResponse,
  InternalErrorResponse,
} from "./rpc-response";

const scheduleCacheWrite = <TServerContext>(
  context: NexusContext<TServerContext>,
  response: RpcSuccessResponse
): void => {
  const { cacheHandler, logger } = context.config;
  if (!cacheHandler) {
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

export const relayMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>,
  next: NextFn
) => {
  const { logger } = context.config;
  logger.info("relay middleware");
  const { request, rpcEndpointPool } = context;

  try {
    const relaySuccess = await rpcEndpointPool.relay(request.payload);

    if (relaySuccess) {
      const response = new RpcSuccessResponse(
        request.getResponseId(),
        relaySuccess.response.result
      );

      // TODO: move this to the cache middleware.
      // store a flag on the context object to indicate that the
      // response is appropriate for caching.
      // but the cache handler itself should make the ultimate
      // decision about whether to cache the response.

      scheduleCacheWrite(context, response);

      return context.respond(response);
    }

    const relayError = rpcEndpointPool.getLatestLegalRelayError();

    if (relayError) {
      return context.respond(
        RpcResponse.fromErrorResponsePayload(
          relayError.response.error,
          request.getResponseId()
        )
      );
    }

    return context.respond(new InternalErrorResponse(request.getResponseId()));
  } catch (e) {
    const error = safeJsonStringify(e);

    logger.error(error);

    return context.respond(new InternalErrorResponse(request.getResponseId()));
  }
};
