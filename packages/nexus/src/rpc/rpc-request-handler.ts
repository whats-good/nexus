import { safeAsyncNextTick, safeJsonStringify } from "@src/utils";
import type { Logger } from "@src/logger";
import type { CacheHandler } from "@src/cache";
import { RpcContext } from "./rpc-context";
import {
  InternalErrorResponse,
  MethodDeniedCustomErrorResponse,
  RpcResponse,
  RpcSuccessResponse,
} from "./rpc-response";
import { NexusResponse } from "@src/controller/nexus-response";
import { NexusConfig } from "@src/config";
import {
  NextFn,
  NexusMiddleware,
  NexusMiddlewareManager,
} from "@src/middleware";

export class RpcRequestHandler<TServerContext> {
  private readonly logger: Logger;
  private readonly cacheHandler?: CacheHandler;
  private readonly middlewares: NexusMiddleware<TServerContext>[];

  constructor(args: {
    logger: Logger;
    cacheHandler?: CacheHandler;
    middlewares: NexusMiddleware<TServerContext>[];
  }) {
    this.logger = args.logger;
    this.cacheHandler = args.cacheHandler;
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
      middlewares: config.middlewares,
    });
  }

  public async handle(
    rpcContext: RpcContext<TServerContext>
  ): Promise<NexusResponse> {
    const middlewareManager = new NexusMiddlewareManager(
      this.middlewares,
      rpcContext
    );

    await middlewareManager.run();

    if (!rpcContext.response) {
      return new InternalErrorResponse(rpcContext.request.getResponseId());
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
    }
    return nextFn();
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
