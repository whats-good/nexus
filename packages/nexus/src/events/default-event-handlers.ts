import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import { RelaySuccessEvent } from "./default-events";
import { NexusEventHandler } from "./nexus-event-handler";
import { NexusContext } from "@src/rpc";

export const cacheWriteOnRelaySuccess: NexusEventHandler<
  RelaySuccessEvent,
  any
> = async (event: RelaySuccessEvent, context: NexusContext) => {
  const { response } = event;
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
