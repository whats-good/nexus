import { NextFn } from "@src/middleware";
import { safeJsonStringify } from "@src/utils";
import { NexusContext } from "./nexus-context";
import { RpcSuccessResponse } from "./rpc-response";
import { NexusEvent } from "@src/events";

export class CannedResponseHitEvent extends NexusEvent {}
export class CannedResponseMissEvent extends NexusEvent {
  constructor(
    public readonly kind: "not-configured" | "unexpected-error" | "cancelled"
  ) {
    super();
  }
}

export const cannedResponseMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>,
  next: NextFn
) => {
  const { logger } = context.config;
  logger.debug("canned response middleware");
  const { request } = context;
  const { methodDescriptor } = request;

  const cannedResponse = methodDescriptor.cannedResponse({
    chain: context.chain,
    params: request.payload.params,
  });

  if (cannedResponse.kind === "success") {
    logger.info(
      `Returning canned response for method ${request.payload.method}.`
    );
    context.eventBus.emit(new CannedResponseHitEvent());

    return context.respond(
      new RpcSuccessResponse(request.getResponseId(), cannedResponse.result)
    );
  } else if (cannedResponse.kind === "failure") {
    logger.error(
      `Canned response for method ${
        request.payload.method
      } threw an error: ${safeJsonStringify(
        cannedResponse.error
      )}. This should not happen, but it's not fatal. Moving on.`
    );
    context.eventBus.emit(new CannedResponseMissEvent("unexpected-error"));
  } else {
    // TODO: canned responses should have a different behavior kind, where internally, depending on the
    // parameters and the context, it can decide to forego its own response and let the request continue.
    // i.e "cancelled"
    context.eventBus.emit(new CannedResponseMissEvent("not-configured"));
  }
  return next();
};
