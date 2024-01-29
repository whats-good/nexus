import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import type { Logger } from "@src/logger";
import type { CacheHandler } from "@src/cache/cache-handler";
import type { NexusContext } from "./nexus-context";
import { RpcSuccessResponse, RpcResponse } from "./rpc-response";
import type { RpcRequestWithValidPayload } from "./rpc-request";

export class RpcRequestHandler {
  constructor(
    private readonly logger: Logger,
    private readonly cacheHandler: CacheHandler
  ) {}

  private scheduleCacheWrite(
    context: NexusContext,
    request: RpcRequestWithValidPayload,
    response: RpcSuccessResponse
  ): void {
    safeAsyncNextTick(
      async () => {
        await this.cacheHandler
          .handleWrite(context, request, response.build())
          .then((writeResult) => {
            if (writeResult.kind === "success") {
              this.logger.info("successfully cached response.");
            } else {
              this.logger.warn("failed to cache response.");
            }
          });
      },
      (error) => {
        const errorMsg = `Error while caching response: ${safeJsonStringify(
          error
        )}`;
        this.logger.error(errorMsg);
      }
    );
  }

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

    const cacheResult = await this.cacheHandler.handleRead(context, request);

    if (cacheResult.kind === "success-result") {
      return new RpcSuccessResponse(
        request.getResponseId(),
        cacheResult.result
      );
    }

    // TODO: right now, only success results are returned.
    // We should allow configurations to specify which errors can be cached and returned.

    try {
      const relaySuccess = await rpcEndpointPool.relay(request.parsedPayload);

      if (relaySuccess) {
        const response = new RpcSuccessResponse(
          request.getResponseId(),
          relaySuccess.response.result
        );

        this.scheduleCacheWrite(context, request, response);

        return response;
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

    // TODO: add cache writes at the parent level.
    // do this in an event handler.

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
