import { z } from "zod";
import type { Logger } from "pino";
import type { NexusConfig } from "@src/nexus-config";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
import type { NodeEndpointPoolFactory } from "@src/node-endpoint";
import type { StaticContainer } from "@src/dependency-injection";
import { NexusRpcContext } from "@src/dependency-injection";
import type { RpcResponse } from "@src/rpc-response";
import {
  ChainNotFoundErrorResponse,
  InternalErrorResponse,
  ParseErrorResponse,
  ProviderNotConfiguredErrorResponse,
  RpcErrorResponse,
  RpcSuccessResponse,
} from "@src/rpc-response";
import { NexusMiddlewareHandler } from "@src/middleware";
import { safeErrorStringify, safeJsonStringify } from "@src/utils";
import {
  RpcResponseErrorEvent,
  RpcResponseSuccessEvent,
} from "@src/node-relay-handler/events";
import type { PathParamsOf } from "./route";
import { Route } from "./route";
import { NexusNotFoundResponse, type NexusResponse } from "./nexus-response";

const IntString = z
  .number({
    coerce: true,
  })
  .int();

const chainIdRoute = new Route(
  "(.*)/:chainId",
  z.object({
    chainId: IntString,
  })
);

export class Controller<TPlatformContext = unknown> {
  private readonly container: StaticContainer<TPlatformContext>;
  private readonly config: NexusConfig<TPlatformContext>;
  private readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory<TPlatformContext>;
  private readonly logger: Logger;

  constructor(container: StaticContainer<TPlatformContext>) {
    this.container = container;
    this.logger = container.logger.child({ name: this.constructor.name });
    this.config = container.config;
    this.nodeEndpointPoolFactory = container.nodeEndpointPoolFactory;
  }

  public async handleRequest(
    request: Request,
    platformContext: TPlatformContext
  ): Promise<NexusResponse> {
    const url = new URL(request.url);
    const chainIdParams = chainIdRoute.match(url.pathname);

    if (chainIdParams) {
      return this.handleChainIdRoute(chainIdParams, request, platformContext);
    }

    return new NexusNotFoundResponse();
  }

  private async handleRpcContext(
    ctx: NexusRpcContext<TPlatformContext>
  ): Promise<RpcResponse> {
    const middlewareHandler = new NexusMiddlewareHandler({
      ctx,
      middleware: this.config.middleware,
    });

    try {
      await middlewareHandler.handle();
    } catch (e) {
      this.logger.error(
        `Error in rpc middleware. Error: ${safeErrorStringify(e)}`
      );

      ctx.setResponse(new InternalErrorResponse(ctx.requestId));
    }

    let response = ctx.getResponse();

    if (!response) {
      this.logger.error(
        `No response set in context for request: ${safeJsonStringify(
          ctx.rpcRequestPayload
        )}`
      );

      response = new InternalErrorResponse(ctx.requestId);
      ctx.setResponse(response);
    }

    if (response instanceof RpcSuccessResponse) {
      ctx.eventBus.dispatch(new RpcResponseSuccessEvent(response));
    } else if (response instanceof RpcErrorResponse) {
      ctx.eventBus.dispatch(new RpcResponseErrorEvent(response));
    } else {
      // this should never happen
      this.logger.error(
        `Invalid response type in context: ${safeJsonStringify(response)}`
      );
      throw new Error("Invalid response type in context");
    }

    this.container.nextTick(() => {
      ctx.eventBus.processAllEvents().catch((e: unknown) => {
        this.logger.error(
          `Error processing events after handling RPC request. Error: ${safeErrorStringify(
            e
          )}`
        );
      });
    });

    return response;
  }

  private async handleChainIdRoute(
    params: PathParamsOf<typeof chainIdRoute>,
    request: Request,
    platformContext: TPlatformContext
  ): Promise<RpcResponse> {
    let parsedJsonRequestPayload: unknown;

    try {
      parsedJsonRequestPayload = await request.json();
    } catch (error) {
      return new ParseErrorResponse();
    }

    const rpcRequestPayload = RpcRequestPayloadSchema.safeParse(
      parsedJsonRequestPayload
    );

    if (!rpcRequestPayload.success) {
      return new ParseErrorResponse();
    }

    const chain = this.config.chains.get(params.chainId);

    if (!chain) {
      return new ChainNotFoundErrorResponse(
        rpcRequestPayload.data.id || null,
        params.chainId
      );
    }

    const nodeEndpointPool =
      this.nodeEndpointPoolFactory.getEndpointPoolForChain(chain);

    if (!nodeEndpointPool) {
      return new ProviderNotConfiguredErrorResponse(
        rpcRequestPayload.data.id || null,
        chain
      );
    }

    const ctx = new NexusRpcContext({
      container: this.container,
      platformContext,
      chain,
      nodeEndpointPool,
      rpcRequestPayload: rpcRequestPayload.data,
      request,
    });

    return this.handleRpcContext(ctx);
  }
}
