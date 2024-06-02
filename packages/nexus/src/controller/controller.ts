import { z } from "zod";
import type { NexusConfig } from "@src/nexus-config";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
import type { NodeEndpointPoolFactory } from "@src/node-endpoint";
import type { StaticContainer } from "@src/dependency-injection";
import { RequestContainer } from "@src/dependency-injection";
import { RpcRequestHandler } from "../rpc-request-handler";
import type { PathParamsOf } from "./route";
import { Route } from "./route";
import {
  ChainNotFoundErrorResponse,
  NexusBadRequestResponse,
  NexusNotFoundResponse,
  ProviderNotConfiguredErrorResponse,
  type NexusResponse,
} from "./nexus-response";

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

export class Controller<TServerContext = unknown> {
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
    serverContext: TServerContext
  ): Promise<NexusResponse> {
    const url = new URL(request.url);
    const chainIdParams = chainIdRoute.match(url.pathname);

    if (chainIdParams) {
      return this.handleChainIdRoute(chainIdParams, request, serverContext);
    }

    return new NexusNotFoundResponse();
  }

  private async handleChainIdRoute(
    params: PathParamsOf<typeof chainIdRoute>,
    request: Request,
    serverContext: TServerContext
  ): Promise<NexusResponse> {
    const chain = this.config.chains.get(params.chainId);

    // TODO: maybe everything within this method should be a json rpc response
    // TODO: maybe we should first try and parse out the requestId first, without
    // checking the rest

    if (!chain) {
      return new ChainNotFoundErrorResponse(params.chainId);
    }

    const nodeEndpointPool =
      this.nodeEndpointPoolFactory.getEndpointPoolForChain(chain);

    if (!nodeEndpointPool) {
      // TODO: maybe this should be a json rpc response
      return new ProviderNotConfiguredErrorResponse(chain);
    }

    let parsedJsonRequestPayload: unknown;

    try {
      parsedJsonRequestPayload = await request.json();
    } catch (error) {
      // TODO: replace these with typed json rpc responses
      return new NexusBadRequestResponse();
    }

    const rpcRequestPayload = RpcRequestPayloadSchema.safeParse(
      parsedJsonRequestPayload
    );

    if (!rpcRequestPayload.success) {
      // TODO: replace these with typed json rpc responses
      return new NexusBadRequestResponse();
    }

    const container = new RequestContainer({
      parent: this.container,
      serverContext,
      chain,
      nodeEndpointPool,
      rpcRequestPayload: rpcRequestPayload.data,
    });

    const rpcRequestHandler = new RpcRequestHandler(container);

    return rpcRequestHandler.handle();
  }
}
