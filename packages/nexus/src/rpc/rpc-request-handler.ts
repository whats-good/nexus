import { safeJsonStringify } from "@src/utils";
import type { Logger } from "@src/logger";
import type { NexusContext } from "./nexus-context";
import { RpcSuccessResponse, RpcResponse } from "./rpc-response";
import type { RpcRequestWithValidPayload } from "./rpc-request";

export class RpcRequestHandler {
  constructor(public readonly logger: Logger) {}

  private async handleValidRequest(
    context: NexusContext,
    request: RpcRequestWithValidPayload
  ): Promise<RpcResponse> {
    const { rpcEndpointPool, chain } = context;
    const { methodDescriptor } = request;

    const requestFilterResult = methodDescriptor.requestFilter({
      chain,
      params: request.parsedPayload.params,
    });

    if (requestFilterResult.kind === "deny") {
      return request.toMethodDeniedCustomErrorResponse();
    } else if (requestFilterResult.kind === "failure") {
      // TODO: make this behavior configurable.
      this.logger.error(
        `Request filter for method ${
          request.parsedPayload.method
        } threw an error: ${safeJsonStringify(
          requestFilterResult.error
        )}. This should never happen, and it's a critical error. Denying access to method. Please report this, fix the bug, and restart the node.`
      );

      return request.toMethodDeniedCustomErrorResponse();
    }

    const cannedResponse = methodDescriptor.cannedResponse({
      chain: context.chain,
      params: request.parsedPayload.params,
    });

    if (cannedResponse.kind === "success") {
      this.logger.info(
        `Canned response for method ${request.parsedPayload.method} returned.`
      );

      return new RpcSuccessResponse(
        request.getResponseId(),
        cannedResponse.result
      );
    } else if (cannedResponse.kind === "failure") {
      this.logger.error(
        `Canned response for method ${
          request.parsedPayload.method
        } threw an error: ${safeJsonStringify(
          cannedResponse.error
        )}. This should not happen, but it's not fatal. Request will be relayed.`
      );
    }

    try {
      const relaySuccess = await rpcEndpointPool.relay(request.parsedPayload);

      if (relaySuccess) {
        return new RpcSuccessResponse(
          request.getResponseId(),
          relaySuccess.response.result
        );
      }

      const relayError = rpcEndpointPool.getLatestLegalRelayError();

      if (relayError) {
        return RpcResponse.fromRelayLegalErrorResponse(request, relayError);
      }

      return request.toInternalErrorResponse();
    } catch (e) {
      const error = safeJsonStringify(e);

      this.logger.error(error);

      return request.toInternalErrorResponse();
    }
  }

  public async handle(context: NexusContext): Promise<RpcResponse> {
    const { request } = context;

    if (request.kind === "parse-error") {
      return request.toParseErrorResponse();
    } else if (request.kind === "invalid-request") {
      return request.toInvalidRequestErrorResponse();
    } else if (request.kind === "method-not-found") {
      return request.toMethodNotFoundErrorResponse();
    } else if (request.kind === "invalid-params") {
      return request.toInvalidParamsErrorResponse();
    }

    return this.handleValidRequest(context, request);
  }
}
