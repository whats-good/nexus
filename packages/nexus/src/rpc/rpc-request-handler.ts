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
    const { rpcEndpointPool } = context;

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
