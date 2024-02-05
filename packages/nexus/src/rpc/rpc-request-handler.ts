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
import { NodeProviderRegistry } from "@src/node-provider";
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
import { RelayFailureConfig, RpcEndpointPool } from "@src/rpc-endpoint";
import { NexusController } from "@src/controller";
import { NexusConfig } from "@src/config";
import {
  NextFn,
  NexusMiddleware,
  NexusMiddlewareManager,
} from "@src/middleware";

export class RpcRequestHandler<TServerContext> extends NexusController<{
  chainId: number;
}> {
  private readonly logger: Logger;
  private readonly cacheHandler?: CacheHandler;
  private readonly nodeProviderRegistry: NodeProviderRegistry;
  private readonly chainRegistry: ChainRegistry;
  private readonly rpcMethodRegistry: RpcMethodDescriptorRegistry;
  private readonly relayFailureConfig: RelayFailureConfig;
  private readonly serverContext: TServerContext;
  private readonly middlewares: NexusMiddleware<TServerContext>[];

  constructor(args: {
    logger: Logger;
    cacheHandler?: CacheHandler;
    nodeProviderRegistry: NodeProviderRegistry;
    chainRegistry: ChainRegistry;
    rpcMethodRegistry: RpcMethodDescriptorRegistry;
    relayFailureConfig: RelayFailureConfig;
    serverContext: TServerContext;
    middlewares: NexusMiddleware<TServerContext>[];
  }) {
    super();
    this.logger = args.logger;
    this.cacheHandler = args.cacheHandler;
    this.nodeProviderRegistry = args.nodeProviderRegistry;
    this.chainRegistry = args.chainRegistry;
    this.rpcMethodRegistry = args.rpcMethodRegistry;
    this.relayFailureConfig = args.relayFailureConfig;
    this.serverContext = args.serverContext;
    this.middlewares = [
      ...args.middlewares,
      this.requestFilterMiddleware.bind(this),
      this.cannedResponseMiddleware.bind(this),
      this.cacheMiddleware.bind(this),
      this.relayMiddleware.bind(this),
    ];
  }

  public static fromConfig<TServerContext>(
    config: NexusConfig<TServerContext>
  ): RpcRequestHandler<TServerContext> {
    return new RpcRequestHandler({
      logger: config.logger,
      cacheHandler: config.cacheHandler,
      nodeProviderRegistry: config.nodeProviderRegistry,
      chainRegistry: config.chainRegistry,
      rpcMethodRegistry: config.rpcMethodRegistry,
      relayFailureConfig: config.relayFailureConfig,
      serverContext: config.serverContext,
      middlewares: config.middlewares,
    });
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

  public async handle(
    request: Request,
    pathParams: { chainId: number }
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
    const endpoints = this.nodeProviderRegistry.getEndpointsForChain(chain);
    if (endpoints.length === 0) {
      return new ProviderNotConfiguredCustomErrorResponse(responseId);
    }
    const rpcEndpointPool = new RpcEndpointPool(
      endpoints,
      this.relayFailureConfig,
      this.logger
    );

    const rpcContext = new RpcContext(
      rpcRequest,
      chain,
      rpcEndpointPool,
      this.serverContext
    );

    const middlewareManager = new NexusMiddlewareManager(
      this.middlewares,
      rpcContext
    );

    await middlewareManager.run();

    if (!rpcContext.response) {
      return new InternalErrorResponse(responseId);
    }

    return rpcContext.response;
  }

  private scheduleCacheWrite(
    context: RpcContext,
    response: RpcSuccessResponse
  ): void {
    const { cacheHandler } = this;
    if (!cacheHandler) {
      return;
    }

    safeAsyncNextTick(
      async () => {
        await cacheHandler
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

  private async requestFilterMiddleware(
    context: RpcContext<TServerContext>,
    nextFn: NextFn
  ) {
    this.logger.info("request filter middleware");
    const { chain, request } = context;
    const { methodDescriptor } = request;
    const requestFilterResult = methodDescriptor.requestFilter({
      chain,
      params: request.payload.params,
    });

    if (requestFilterResult.kind === "deny") {
      context.respond(
        new MethodDeniedCustomErrorResponse(request.getResponseId())
      );
    } else if (requestFilterResult.kind === "failure") {
      // TODO: make this behavior configurable.
      this.logger.error(
        `Request filter for method ${
          request.payload.method
        } threw an error: ${safeJsonStringify(
          requestFilterResult.error
        )}. This should never happen, and it's a critical error. Denying access to method. Please report this, fix the bug, and restart the node.`
      );

      context.respond(
        new MethodDeniedCustomErrorResponse(request.getResponseId())
      );
    } else {
      return nextFn();
    }
  }

  private async cannedResponseMiddleware(
    context: RpcContext<TServerContext>,
    nextFn: NextFn
  ) {
    this.logger.info("canned response middleware");
    const { request } = context;
    const { methodDescriptor } = request;

    const cannedResponse = methodDescriptor.cannedResponse({
      chain: context.chain,
      params: request.payload.params,
    });

    if (cannedResponse.kind === "success") {
      this.logger.info(
        `Returning canned response for method ${request.payload.method}.`
      );

      return context.respond(
        new RpcSuccessResponse(request.getResponseId(), cannedResponse.result)
      );
    } else if (cannedResponse.kind === "failure") {
      this.logger.error(
        `Canned response for method ${
          request.payload.method
        } threw an error: ${safeJsonStringify(
          cannedResponse.error
        )}. This should not happen, but it's not fatal. Moving on.`
      );
      return nextFn();
    }
  }

  private async cacheMiddleware(
    context: RpcContext<TServerContext>,
    nextFn: NextFn
  ) {
    this.logger.info("cache middleware");
    const { request } = context;

    if (this.cacheHandler) {
      const cacheResult = await this.cacheHandler.handleRead(context);

      if (cacheResult.kind === "success-result") {
        // TODO: right now, only success results are returned.
        // We should allow configurations to specify which errors can be cached and returned.
        return context.respond(
          new RpcSuccessResponse(request.getResponseId(), cacheResult.result)
        );
      }
    }

    return nextFn();
  }

  private async relayMiddleware(
    context: RpcContext<TServerContext>,
    nextFn: NextFn
  ) {
    this.logger.info("relay middleware");
    const { request, rpcEndpointPool } = context;

    try {
      const relaySuccess = await rpcEndpointPool.relay(request.payload);

      if (relaySuccess) {
        const response = new RpcSuccessResponse(
          request.getResponseId(),
          relaySuccess.response.result
        );

        this.scheduleCacheWrite(context, response);

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

      return context.respond(
        new InternalErrorResponse(request.getResponseId())
      );
    } catch (e) {
      const error = safeJsonStringify(e);

      this.logger.error(error);

      return context.respond(
        new InternalErrorResponse(request.getResponseId())
      );
    }
  }
}
