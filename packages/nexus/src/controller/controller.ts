import type { Logger } from "pino";
import type { NexusConfig } from "@src/nexus-config";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
import type { StaticContainer } from "@src/dependency-injection";
import { NexusRpcContext } from "@src/dependency-injection";
import type { RpcResponse } from "@src/rpc-response";
import {
  ChainNotFoundErrorResponse,
  InternalErrorResponse,
  ParseErrorResponse,
  RpcErrorResponse,
  RpcSuccessResponse,
} from "@src/rpc-response";
import { NexusMiddlewareHandler } from "@src/middleware";
import type { PathParamsOf } from "@src/routes";
import { chainIdRoute } from "@src/routes";
import { errSerialize } from "@src/utils";
import { HttpRelayHandler } from "@src/http-relay-handler";
import { NexusNotFoundResponse, type NexusResponse } from "./nexus-response";

export class Controller {
  private readonly container: StaticContainer;
  private readonly config: NexusConfig;
  private readonly logger: Logger;
  private readonly httpRelayHandler: HttpRelayHandler;

  constructor(container: StaticContainer) {
    this.container = container;
    this.logger = container.logger.child({ name: this.constructor.name });
    this.config = container.config;
    this.httpRelayHandler = new HttpRelayHandler(container);
  }

  public async handleRequest(request: Request): Promise<NexusResponse> {
    const url = new URL(request.url);
    const chainIdParams = chainIdRoute.match(url.pathname);

    if (chainIdParams) {
      return this.handleChainIdRoute(chainIdParams, request);
    }

    return new NexusNotFoundResponse();
  }

  private async handleRpcContext(ctx: NexusRpcContext): Promise<RpcResponse> {
    const middlewareHandler = new NexusMiddlewareHandler({
      ctx,
      container: this.container,
      middleware: this.config.middleware,
    });

    try {
      await middlewareHandler.handle();
    } catch (e) {
      this.logger.error(errSerialize(e), "Error in rpc middleware");

      ctx.setResponse(new InternalErrorResponse(ctx.request.id));
    }

    let response = ctx.getResponse();

    if (!response) {
      try {
        response = await this.httpRelayHandler.handle(ctx);
      } catch (e) {
        this.logger.error(errSerialize(e), "Error in node relay handler");

        response = new InternalErrorResponse(ctx.request.id);
      }
    }

    if (response instanceof RpcSuccessResponse) {
      this.container.eventBus.emit("rpcResponseSuccess", response, ctx);
    } else if (response instanceof RpcErrorResponse) {
      this.container.eventBus.emit("rpcResponseError", response, ctx);
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

    const ctx = new NexusRpcContext({
      chain,
      rpcRequestPayload: rpcRequestPayload.data,
      url: new URL(request.url),
    });

    return this.handleRpcContext(ctx);
  }
}
