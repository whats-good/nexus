import { z } from "zod";
import type { NexusConfig } from "@src/nexus-config";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
import type { NodeEndpointPoolFactory } from "@src/node-endpoint";
import type { StaticContainer } from "@src/dependency-injection";
import { RequestContainer } from "@src/dependency-injection";
import type { RpcResponse } from "@src/rpc-request-handler/rpc-response";
import {
  ChainNotFoundErrorResponse,
  ParseErrorResponse,
  ProviderNotConfiguredErrorResponse,
} from "@src/rpc-request-handler/rpc-response";
import { RpcRequestHandler } from "../rpc-request-handler";
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
  private readonly container: StaticContainer;
  private readonly config: NexusConfig;
  private readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory;

  constructor(container: StaticContainer) {
    this.container = container;
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

    const container = new RequestContainer({
      parent: this.container,
      platformContext,
      chain,
      nodeEndpointPool,
      rpcRequestPayload: rpcRequestPayload.data,
    });

    const rpcRequestHandler = new RpcRequestHandler(container);

    return rpcRequestHandler.handle();
  }
}
