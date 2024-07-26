import type { Logger } from "pino";
import { Lifecycle, scoped } from "tsyringe";
import { NexusConfig } from "@src/nexus-config";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
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
import { NexusRpcContext } from "@src/nexus-rpc-context";
import { LoggerFactory } from "@src/logging";
import { EventBus } from "@src/events";
import { HttpRelayHandler } from "./http-relay-handler";
import { NexusNotFoundResponse, type NexusResponse } from "./nexus-response";

@scoped(Lifecycle.ContainerScoped)
export class HttpController {
  private readonly logger: Logger;

  constructor(
    private readonly config: NexusConfig,
    private readonly loggerFactory: LoggerFactory,
    private readonly httpRelayHandler: HttpRelayHandler,
    private readonly middlewareHandler: NexusMiddlewareHandler,
    private readonly eventBus: EventBus
  ) {
    this.logger = this.loggerFactory.get(HttpController.name);
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
    try {
      await this.middlewareHandler.handle(ctx);
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
      this.eventBus.emit("rpcResponseSuccess", response, ctx);
    } else if (response instanceof RpcErrorResponse) {
      this.eventBus.emit("rpcResponseError", response, ctx);
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
