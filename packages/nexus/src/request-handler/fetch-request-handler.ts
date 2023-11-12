import type { ChainRegistry } from "../chain/chain-registry";
import type { Config } from "../config";
import { matchPath } from "../routes/routes";
import { JsonRPCRequestSchema } from "../rpc-endpoint/json-rpc-types";
import type { RpcEndpointPoolFactory } from "../rpc-endpoint/rpc-endpoint-pool-factory";
import type { Nexus } from "../nexus";
import { RpcProxyContext } from "./rpc-proxy-context";
import type { NexusPreResponse } from "./abstract-request-handler";
import { AbstractRequestHandler } from "./abstract-request-handler";

export class FetchRequestHandler extends AbstractRequestHandler<Response> {
  private readonly request: Request;

  constructor(params: {
    config: Config;
    chainRegistry: ChainRegistry;
    rpcEndpointPoolFactory: RpcEndpointPoolFactory;
    request: Request;
  }) {
    super(params);
    this.request = params.request;
  }

  public static init(nexus: Nexus, request: Request) {
    return new FetchRequestHandler({
      config: nexus.config,
      chainRegistry: nexus.chainRegistry,
      rpcEndpointPoolFactory: nexus.rpcEndpointPoolFactory,
      request,
    });
  }

  private async parseJSONRpcRequest() {
    // we clean the request to remove any non-required pieces
    let payload: unknown;

    try {
      payload = await this.request.json();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            request: this.request,
            error,
          },
          null,
          2
        )
      );

      return {
        type: "invalid-json-request",
        request: this.request,
        error,
      } as const;
    }

    const parsedPayload = JsonRPCRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      console.error(parsedPayload.error);

      return {
        type: "invalid-json-rpc-request",
        request: this.request,
        payload,
        error: parsedPayload.error,
      } as const;
    }

    return {
      type: "success",
      request: this.request,
      data: parsedPayload.data,
    } as const;
  }

  protected async getContext(): Promise<RpcProxyContext> {
    const requestUrl = new URL(this.request.url);
    const requestPath = requestUrl.pathname;

    const route = matchPath(requestUrl.pathname);
    const chain = route
      ? this.chainRegistry.getByOptionalParams(route.params)
      : undefined;
    const pool = chain
      ? this.rpcEndpointPoolFactory.fromChain(chain)
      : undefined;

    const jsonRPCRequestParseResult = await this.parseJSONRpcRequest();

    const clientAccessKey = requestUrl.searchParams.get("key") || undefined;

    return new RpcProxyContext({
      pool,
      config: this.config,
      chain,
      path: requestPath,
      clientAccessKey,
      httpMethod: this.request.method,
      jsonRPCRequest:
        jsonRPCRequestParseResult.type === "success"
          ? jsonRPCRequestParseResult.data
          : undefined,
    });
  }

  protected handlePreResponse(preResponse: NexusPreResponse) {
    if (preResponse.type === "json") {
      return Response.json(preResponse.body, {
        status: preResponse.status,
      });
    }

    console.error("Unsupported response type", preResponse);

    return Response.json(
      {
        message: "Unsupported response type",
      },
      {
        status: 500,
      }
    );
  }
}
