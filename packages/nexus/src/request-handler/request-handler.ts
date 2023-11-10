import type { Config } from "../config";
import { matchPath } from "../routes/routes";
import { RpcEndpointPoolFactory } from "../rpc-endpoint/rpc-endpoint-pool-factory";
import type { ChainRegistry } from "../chain/chain-registry";
import { defaultChainRegistry } from "../setup/data";
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

  private buildContext(request: Request): RpcProxyContext {
    const requestUrl = new URL(request.url);

    const route = matchPath(requestUrl.pathname);
    const chain = route
      ? this.chainRegistry.getByOptionalParams(route.params)
      : undefined;
    const pool = chain ? this.endpointFactory.fromChain(chain) : undefined;

    return new RpcProxyContext({
      pool,
      config: this.config,
      chain,
      request,
    });
  }

  private async handleStatus(context: RpcProxyContext): Promise<Response> {
    const status = await context.getStatus();

    return Response.json(status, {
      status: status.code,
    });
  }

  private async handleRpcRelay(context: RpcProxyContext): Promise<Response> {
    if (!context.pool) {
      return new Response("Unexpected Error: Not Found", { status: 500 });
    }

    const result = await context.pool.relay(context.request);

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
    const context = this.buildContext(request);

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
