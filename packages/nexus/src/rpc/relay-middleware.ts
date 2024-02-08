import { safeJsonStringify } from "@src/utils";
import { NexusContext } from "./nexus-context";
import {
  RpcSuccessResponse,
  RpcResponse,
  InternalErrorResponse,
} from "./rpc-response";
import { EVENT } from "@src/events";

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

      context.config.eventBus.emit(new EVENT.RelaySuccessEvent(response));

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
