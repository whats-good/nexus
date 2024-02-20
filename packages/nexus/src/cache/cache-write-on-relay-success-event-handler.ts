import { NexusEventHandler } from "@src/events/nexus-event-handler";
import { RelaySuccessResponseEvent } from "@src/rpc/relay-middleware";
import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import { CacheWriteDeniedEvent } from "./cache-handler";
import { Container } from "@src/dependency-injection";

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
