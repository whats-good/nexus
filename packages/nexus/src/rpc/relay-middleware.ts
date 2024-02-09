import { safeJsonStringify } from "@src/utils";
import { NexusContext } from "./nexus-context";
import {
  RpcSuccessResponse,
  RpcResponse,
  InternalErrorResponse,
} from "./rpc-response";
import { NexusEvent } from "@src/events";
import { ErrorResponsePayload } from "./schemas";

export class RelaySuccessResponseEvent extends NexusEvent {
  constructor(public readonly response: RpcSuccessResponse) {
    super();
  }
}

export class RelayLegalErrorResponeEvent extends NexusEvent {
  constructor(public readonly error: ErrorResponsePayload) {
    super();
  }
}

export class RelayUnexpectedErrorEvent extends NexusEvent {
  constructor(public readonly error: unknown) {
    super();
  }
}

export const relayMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>
) => {
  const { logger } = context.config;
  logger.debug("relay middleware");
  const { request, rpcEndpointPool } = context;

  try {
    const relaySuccess = await rpcEndpointPool.relay(request.payload);

    if (relaySuccess) {
      const response = new RpcSuccessResponse(
        request.getResponseId(),
        relaySuccess.response.result
      );

      context.eventBus.emit(new RelaySuccessResponseEvent(response));

      return context.respond(response);
    }

    const relayError = rpcEndpointPool.getLatestLegalRelayError();

    if (relayError) {
      context.eventBus.emit(new RelayLegalErrorResponeEvent(relayError.error));
      return context.respond(
        RpcResponse.fromErrorResponsePayload(
          relayError.error.error,
          request.getResponseId()
        )
      );
    }

    context.eventBus.emit(
      new RelayUnexpectedErrorEvent("no response or error")
    );
    return context.respond(new InternalErrorResponse(request.getResponseId()));
  } catch (e) {
    const error = safeJsonStringify(e);

    logger.error(error);

    context.eventBus.emit(new RelayUnexpectedErrorEvent(e));
    return context.respond(new InternalErrorResponse(request.getResponseId()));
  }
};
