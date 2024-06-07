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
} from "@src/rpc-response";
import { NexusMiddlewareHandler } from "@src/middleware";
import { safeErrorStringify, safeJsonStringify } from "@src/utils";
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
    });

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

      return new InternalErrorResponse(ctx.requestId);
    }

    process.nextTick(() => {
      ctx.eventBus.processAllEvents().catch((e: unknown) => {
        this.logger.error(
          `Error processing events after handling RPC request. Error: ${safeErrorStringify(
            e
          )}`
        );
      });
    });

    const response = ctx.getResponse();

    if (!response) {
      this.logger.error(
        `No response set in context for request: ${safeJsonStringify(
          rpcRequestPayload.data
        )}`
      );

      return new InternalErrorResponse(ctx.requestId);
    }

    return response;
  }
}
