import { safeJsonStringify } from "@src/utils";
import type { Logger } from "@src/logger";
import type { NexusContext } from "./nexus-context";
import { RpcSuccessResponse, RpcResponse } from "./rpc-response";

export class RpcRequestHandler {
  constructor(public readonly logger: Logger) {}

  public async handle(context: NexusContext): Promise<RpcResponse<unknown>> {
    const { request, rpcEndpointPool } = context;

    if (request.kind === "parse-error") {
      return request.toParseError();
    } else if (request.kind === "invalid-request") {
      return request.toInvalidRequestError();
    } else if (request.kind === "method-not-found") {
      return request.toMethodNotFoundError();
    } else if (request.kind === "invalid-params") {
      return request.toInvalidParamsError();
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

      return request.toInternalError();
    } catch (e) {
      const error = safeJsonStringify(e);

      this.logger.error(error);

      return request.toInternalError();
    }
  }
}
