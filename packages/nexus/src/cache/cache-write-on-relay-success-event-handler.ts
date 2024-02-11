import { NexusEventHandler } from "@src/events/nexus-event-handler";
import { NexusContext } from "@src/rpc";
import { RelaySuccessResponseEvent } from "@src/rpc/relay-middleware";
import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import { CacheWriteDeniedEvent } from "./cache-handler";

export const cacheWriteOnRelaySuccess: NexusEventHandler<
  RelaySuccessResponseEvent,
  any
> = async (event: RelaySuccessResponseEvent, context: NexusContext) => {
  const { response } = event;
  const { cacheHandler, logger } = context.config;
  if (!cacheHandler) {
    logger.debug("no cache handler configured. will not schedule cache-write.");
    context.eventBus.emit(new CacheWriteDeniedEvent());
    return;
  }

  safeAsyncNextTick(
    async () => {
      await cacheHandler.handleWrite(context, response.result);
    },
    (error) => {
      const errorMsg = `Error while caching response: ${safeJsonStringify(
        error
      )}`;
      logger.error(errorMsg);
    }
  );
};
