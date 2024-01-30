import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import type { Logger } from "@src/logger";
import type { CacheHandler } from "@src/cache";
import { RpcContext } from "./rpc-context";
import {
  ChainDeniedCustomErrorResponse,
  InternalErrorResponse,
  InvalidParamsErrorResponse,
  InvalidRequestErrorResponse,
  MethodDeniedCustomErrorResponse,
  ParseErrorResponse,
  ProviderNotConfiguredCustomErrorResponse,
  RpcResponse,
  RpcSuccessResponse,
} from "./rpc-response";
import {
  NexusNotFoundResponse,
  NexusResponse,
} from "@src/controller/nexus-response";
import { PathParamsOf, Route } from "@src/controller";
import { z } from "zod";
import { ServiceProviderRegistry } from "@src/service-provider";
import { ChainRegistry } from "@src/chain";
import {
  RpcRequest,
  RpcRequestWithInvalidParamsError,
  RpcRequestWithInvalidRequestError,
  RpcRequestWithMethodNotFoundError,
  RpcRequestWithParseError,
  RpcRequestWithValidPayload,
} from "./rpc-request";
import { RpcRequestPayloadSchema } from "./schemas";
import { RpcMethodDescriptorRegistry } from "@src/rpc-method-desciptor";
import { RpcEndpointPool } from "@src/rpc-endpoint";
import { IntString } from "@src/controller";
import { NexusController } from "@src/controller";

const chainIdRoute = new Route(
  "/chains/:chainId",
  z.object({
    chainId: IntString,
  })
);

export class RpcRequestHandler extends NexusController<typeof chainIdRoute> {
  protected readonly route = chainIdRoute;

  constructor(
    private readonly logger: Logger,
    private readonly cacheHandler: CacheHandler,
    private readonly serviceProviderRegistry: ServiceProviderRegistry,
    private readonly chainRegistry: ChainRegistry,
    private readonly rpcMethodRegistry: RpcMethodDescriptorRegistry
  ) {
    super();
  }

  private async toRpcRequest(request: Request): Promise<RpcRequest> {
    let jsonPayload: unknown;
    try {
      jsonPayload = await request.json();
    } catch (e) {
      return new RpcRequestWithParseError();
    }

    const parsedBasePayload = RpcRequestPayloadSchema.safeParse(jsonPayload);

    if (!parsedBasePayload.success) {
      return new RpcRequestWithInvalidRequestError(jsonPayload);
    }

    const methodDescriptor = this.rpcMethodRegistry.getDescriptorByName(
      parsedBasePayload.data.method
    );

    if (!methodDescriptor) {
      return new RpcRequestWithMethodNotFoundError(parsedBasePayload.data);
    }

    const parsedStrictPayload =
      methodDescriptor.requestPayloadSchema.safeParse(jsonPayload);

    if (!parsedStrictPayload.success) {
      return new RpcRequestWithInvalidParamsError(
        methodDescriptor,
        parsedBasePayload.data
      );
    }

    return new RpcRequestWithValidPayload(
      methodDescriptor,
      parsedBasePayload.data
    );
  }

  // TODO: why is this Request object coming from MDN and not from @whatwg/fetch?
  public async handle(
    request: Request,
    pathParams: PathParamsOf<typeof chainIdRoute>
  ): Promise<NexusResponse> {
    const rpcRequest = await this.toRpcRequest(request);
    const responseId = rpcRequest.getResponseId();
    if (rpcRequest instanceof RpcRequestWithParseError) {
      return new ParseErrorResponse();
    } else if (rpcRequest instanceof RpcRequestWithInvalidRequestError) {
      return new InvalidRequestErrorResponse(responseId);
    } else if (rpcRequest instanceof RpcRequestWithMethodNotFoundError) {
      return new NexusNotFoundResponse();
    } else if (rpcRequest instanceof RpcRequestWithInvalidParamsError) {
      return new InvalidParamsErrorResponse(responseId);
    }

    const chain = this.chainRegistry.getChain(pathParams.chainId);
    if (!chain) {
      return new ChainDeniedCustomErrorResponse(responseId);
    }
    const endpoints = this.serviceProviderRegistry.getEndpointsForChain(
      chain,
      {} // TODO: pass the actual provider keys here!!!
    );
    if (endpoints.length === 0) {
      return new ProviderNotConfiguredCustomErrorResponse(responseId);
    }
    const rpcEndpointPool = new RpcEndpointPool(
      endpoints,
      {
        kind: "cycle-requests", // TODO: use the actual config here!!!
        maxAttempts: 3,
      },
      this.logger
    );

    const rpcContext = new RpcContext(rpcRequest, chain, rpcEndpointPool);

    return this.handleContext(rpcContext);
  }

  private scheduleCacheWrite(
    context: RpcContext,
    response: RpcSuccessResponse
  ): void {
    safeAsyncNextTick(
      async () => {
        await this.cacheHandler
          .handleWrite(context, response.body())
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

  private async handleContext(context: RpcContext): Promise<RpcResponse> {
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

    const cacheResult = await this.cacheHandler.handleRead(context);

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
}
