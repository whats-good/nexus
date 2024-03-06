import { safeJsonStringify } from "@src/utils";
import { NexusContext } from "./nexus-context";
import {
  RpcSuccessResponse,
  RpcResponse,
  InternalErrorResponse,
  ProviderNotConfiguredCustomErrorResponse,
} from "./rpc-response";
import { RpcEndpointPool } from "@src/rpc-endpoint";
import {
  RelaySuccessResponseEvent,
  RelayLegalErrorResponeEvent,
  RelayUnexpectedErrorEvent,
} from "./events";

export const relayMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>
) => {
  const { chain, request } = context;
  const { logger, nodeProviderRegistry, relayFailureConfig } =
    context.container;
  logger.debug("relay middleware");
  const endpoints = nodeProviderRegistry.getEndpointsForChain(chain);
  if (endpoints.length === 0) {
    return context.respond(
      new ProviderNotConfiguredCustomErrorResponse(request.getResponseId())
    );
  }

  logger.debug("pool created.");
  const rpcEndpointPool = new RpcEndpointPool(
    endpoints,
    relayFailureConfig,
    logger
  );

  try {
    const relaySuccess = await rpcEndpointPool.relay(request.payload);

    if (relaySuccess) {
      const response = new RpcSuccessResponse(
        request.getResponseId(),
        relaySuccess.response.result
      );

      context.eventBus.emit(new RelaySuccessResponseEvent(response, context));

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
