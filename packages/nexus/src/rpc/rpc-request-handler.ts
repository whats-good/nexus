import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import type { Logger } from "@src/logger";
import type { CacheHandler } from "@src/cache/cache-handler";
import type { NexusContext } from "./nexus-context";
import {
  InternalErrorResponse,
  MethodDeniedCustomErrorResponse,
  RpcResponse,
  RpcSuccessResponse,
} from "./rpc-response";

export class RpcRequestHandler {
  constructor(
    private readonly logger: Logger,
    private readonly cacheHandler: CacheHandler
  ) {}

  private scheduleCacheWrite(
    context: NexusContext,
    response: RpcSuccessResponse
  ): void {
    safeAsyncNextTick(
      async () => {
        await this.cacheHandler
          .handleWrite(context, response.build())
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

  public async handle(context: NexusContext): Promise<RpcResponse> {
    const { rpcEndpointPool, chain, request } = context;
    const { methodDescriptor } = request;

    const requestFilterResult = methodDescriptor.requestFilter({
      chain,
      params: request.payload.params,
    });

    if (requestFilterResult.kind === "deny") {
      return new MethodDeniedCustomErrorResponse(request.getResponseId());
    } else if (requestFilterResult.kind === "failure") {
      // TODO: make this behavior configurable.
      this.logger.error(
        `Request filter for method ${
          request.payload.method
        } threw an error: ${safeJsonStringify(
          requestFilterResult.error
        )}. This should never happen, and it's a critical error. Denying access to method. Please report this, fix the bug, and restart the node.`
      );

      return new MethodDeniedCustomErrorResponse(request.getResponseId());
    }

    const cannedResponse = methodDescriptor.cannedResponse({
      chain: context.chain,
      params: request.payload.params,
    });

    if (cannedResponse.kind === "success") {
      this.logger.info(
        `Returning canned response for method ${request.payload.method}.`
      );

      return new RpcSuccessResponse(
        request.getResponseId(),
        cannedResponse.result
      );
    } else if (cannedResponse.kind === "failure") {
      this.logger.error(
        `Canned response for method ${
          request.payload.method
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
      const relaySuccess = await rpcEndpointPool.relay(request.payload);

      if (relaySuccess) {
        const response = new RpcSuccessResponse(
          request.getResponseId(),
          relaySuccess.response.result
        );

        this.scheduleCacheWrite(context, response);

        return response;
      }

      const relayError = rpcEndpointPool.getLatestLegalRelayError();

      if (relayError) {
        return RpcResponse.fromErrorResponsePayload(
          relayError.response.error,
          request.getResponseId()
        );
      }

      return new InternalErrorResponse(request.getResponseId());
    } catch (e) {
      const error = safeJsonStringify(e);

      this.logger.error(error);

      return new InternalErrorResponse(request.getResponseId());
    }
  }

  // public async handle(context: NexusContext): Promise<RpcErrorResponse> {
  //   const { request } = context;

  //   // TODO: add cache writes at the parent level.
  //   // do this in an event handler.

  //   if (request.kind === "parse-error") {
  //     return request.toParseErrorResponse();
  //   } else if (request.kind === "invalid-request") {
  //     return request.toInvalidRequestErrorResponse();
  //   } else if (request.kind === "method-not-found") {
  //     return request.toMethodNotFoundErrorResponse();
  //   } else if (request.kind === "invalid-params") {
  //     return request.toInvalidParamsErrorResponse();
  //   }

  //   return this.handleValidRequest(context, request);
  // }
}
