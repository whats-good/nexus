import type { Config } from "../config";
import { matchPath } from "../routes/routes";
import { RpcEndpointPoolFactory } from "../rpc-endpoint/rpc-endpoint-pool-factory";
import type { ChainRegistry } from "../chain/chain-registry";
import { defaultChainRegistry } from "../setup/data";
import { JsonRPCRequestSchema } from "../rpc-endpoint/json-rpc-types";
import { RpcProxyContext } from "./rpc-proxy-context";

export class RequestHandler {
  private readonly endpointFactory: RpcEndpointPoolFactory;
  private readonly chainRegistry: ChainRegistry;
  private readonly config: Config;

  constructor(params: { config: Config; chainRegistry?: ChainRegistry }) {
    this.config = params.config;
    this.endpointFactory = new RpcEndpointPoolFactory({
      config: this.config,
    });
    this.chainRegistry = params.chainRegistry ?? defaultChainRegistry;
  }

  private async parseJSONRpcRequest(request: Request) {
    // we clean the request to remove any non-required pieces
    let payload: unknown;

    try {
      payload = await request.json();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            request,
            error,
          },
          null,
          2
        )
      );

      return {
        type: "invalid-json-request",
        request,
        error,
      } as const;
    }

    const parsedPayload = JsonRPCRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      console.error(parsedPayload.error);

      return {
        type: "invalid-json-rpc-request",
        request,
        payload,
        error: parsedPayload.error,
      } as const;
    }

    return {
      type: "success",
      request,
      data: parsedPayload.data,
    } as const;
  }

  private async buildContext(request: Request): Promise<RpcProxyContext> {
    const requestUrl = new URL(request.url);
    const requestPath = requestUrl.pathname;

    const route = matchPath(requestUrl.pathname);
    const chain = route
      ? this.chainRegistry.getByOptionalParams(route.params)
      : undefined;
    const pool = chain ? this.endpointFactory.fromChain(chain) : undefined;

    const jsonRPCRequestParseResult = await this.parseJSONRpcRequest(request);

    const clientAccessKey = requestUrl.searchParams.get("key") || undefined;

    return new RpcProxyContext({
      pool,
      config: this.config,
      chain,
      path: requestPath,
      clientAccessKey,
      jsonRPCRequest:
        jsonRPCRequestParseResult.type === "success"
          ? jsonRPCRequestParseResult.data
          : undefined,
    });
  }

  private async handleStatus(context: RpcProxyContext): Promise<Response> {
    const status = await context.getStatus();

    return Response.json(status, {
      status: status.code,
    });
  }

  private async handleRpcRelay(context: RpcProxyContext): Promise<Response> {
    if (!context.jsonRPCRequest) {
      // TODO: test
      // TODO: pass the actual parse result into the context, not the
      // jsonRPCRequest
      return new Response("Invalid Json RPC Request ", { status: 400 });
    }

    if (!context.pool) {
      return new Response("Unexpected Error: Not Found", { status: 500 });
    }

    const result = await context.pool.relay(context.jsonRPCRequest);

    if (result.type === "success") {
      return Response.json(result.data);
    }

    // TODO: should respod with a jsonrpc-compliant error

    const status = await context.getStatus();

    // TODO: status should always fail here, given the response is not ok.
    return Response.json(status, {
      status: status.code,
    });
  }

  public async handle(request: Request): Promise<Response> {
    const context = await this.buildContext(request);

    if (request.method === "GET") {
      return this.handleStatus(context);
    } else if (request.method === "POST") {
      return this.handleRpcRelay(context);
    }

    return Response.json(
      {
        message: "Not Found",
      },
      { status: 404 }
    );
  }
}
