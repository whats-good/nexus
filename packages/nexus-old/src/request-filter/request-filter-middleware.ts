import type { NextFn } from "@src/middleware";
import { safeJsonStringify } from "@src/utils";
import type { NexusContext } from "@src/rpc/nexus-context";
import { MethodDeniedCustomErrorResponse } from "@src/rpc/rpc-response";
import {
  RequestFilterAllowedEvent,
  RequestFilterDeniedEvent,
  RequestFilterFailureEvent,
} from "./events";

export const requestFilterMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>,
  next: NextFn
): Promise<void> => {
  const { logger } = context.container;

  logger.debug("request filter middleware");
  const { chain, request } = context;
  const { rpcMethod } = request;
  const requestFilterResult = rpcMethod.requestFilter({
    chain,
    params: request.payload.params,
  });

  if (requestFilterResult.kind === "deny") {
    context.respond(
      new MethodDeniedCustomErrorResponse(request.getResponseId())
    );
    context.eventBus.emit(new RequestFilterDeniedEvent());
  } else if (requestFilterResult.kind === "failure") {
    // TODO: make this behavior configurable.
    logger.error(
      `Request filter for method ${
        request.payload.method
      } threw an error: ${safeJsonStringify(
        requestFilterResult.error
      )}. This should never happen, and it's a critical error. Denying access to method. Please report this, fix the bug, and restart the node.`
    );

    context.respond(
      new MethodDeniedCustomErrorResponse(request.getResponseId())
    );
    context.eventBus.emit(
      new RequestFilterFailureEvent(requestFilterResult.error)
    );
  } else {
    context.eventBus.emit(new RequestFilterAllowedEvent());

    return next();
  }
};
