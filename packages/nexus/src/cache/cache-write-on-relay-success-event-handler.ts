import { NexusEventHandler } from "@src/events/nexus-event-handler";
import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import { Container } from "@src/dependency-injection";
import { RelaySuccessResponseEvent } from "@src/rpc/events";
import { CacheWriteDeniedEvent } from "./events";

export const cacheWriteOnRelaySuccess: NexusEventHandler<
  RelaySuccessResponseEvent,
  any
> = async (event: RelaySuccessResponseEvent, container: Container) => {
  const { response, context } = event;
  const { cacheHandler, logger, eventBus } = container;
  if (!cacheHandler) {
    logger.debug("no cache handler configured. will not schedule cache-write.");
    eventBus.emit(new CacheWriteDeniedEvent());
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
