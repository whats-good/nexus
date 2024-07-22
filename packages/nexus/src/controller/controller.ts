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
import type { PathParamsOf } from "@src/routes";
import { chainIdRoute } from "@src/routes";
import { errSerialize } from "@src/utils";
import { NexusNotFoundResponse, type NexusResponse } from "./nexus-response";

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

  public async handleRequest(request: Request): Promise<NexusResponse> {
    const url = new URL(request.url);
    const chainIdParams = chainIdRoute.match(url.pathname);

    if (chainIdParams) {
      return this.handleChainIdRoute(chainIdParams, request);
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
      this.logger.error(errSerialize(e), "Error in rpc middleware");

      ctx.setResponse(new InternalErrorResponse(ctx.requestId));
    }

    let response = ctx.getResponse();

    if (!response) {
      this.logger.error(
        {
          request: ctx.rpcRequestPayload,
        },
        "No response set in context. Setting InternalErrorResponse."
      );

      response = new InternalErrorResponse(ctx.requestId);
      ctx.setResponse(response);
    }

    if (response instanceof RpcSuccessResponse) {
      ctx.container.eventBus.emit("rpcResponseSuccess", response, ctx);
    } else if (response instanceof RpcErrorResponse) {
      ctx.container.eventBus.emit("rpcResponseError", response, ctx);
    } else {
      // this should never happen
      this.logger.error(response, "Invalid response type in context");
      throw new Error("Invalid response type in context");
    }

    return response;
  }

  private async handleChainIdRoute(
    params: PathParamsOf<typeof chainIdRoute>,
    request: Request
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

    const nodeEndpointPool = this.nodeEndpointPoolFactory.http.get(chain);

    if (!nodeEndpointPool) {
      return new ProviderNotConfiguredErrorResponse(
        rpcRequestPayload.data.id || null,
        chain
      );
    }

    const ctx = new NexusRpcContext({
      container: this.container,
      chain,
      nodeEndpointPool,
      rpcRequestPayload: rpcRequestPayload.data,
      url: new URL(request.url),
    });

    return this.handleRpcContext(ctx);
  }
}
