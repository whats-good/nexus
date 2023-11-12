import type { ChainRegistry } from "../chain/chain-registry";
import type { Config } from "../config";
import type { RpcEndpointPoolFactory } from "../rpc-endpoint/rpc-endpoint-pool-factory";
import type { RpcProxyContext } from "./rpc-proxy-context";

export interface NexusPreResponse {
  status: number;
  body: unknown;
  type: "json" | "text";
}

export abstract class AbstractRequestHandler<ResponseReturnType> {
  protected config: Config;
  protected chainRegistry: ChainRegistry;
  protected rpcEndpointPoolFactory: RpcEndpointPoolFactory;

  constructor(params: {
    config: Config;
    chainRegistry: ChainRegistry;
    rpcEndpointPoolFactory: RpcEndpointPoolFactory;
  }) {
    this.config = params.config;
    this.chainRegistry = params.chainRegistry;
    this.rpcEndpointPoolFactory = params.rpcEndpointPoolFactory;
  }

  public async handle(): Promise<ResponseReturnType> {
    const context = await this.getContext();
    const preResponse = await this.getPreResponseFromContext(context);

    return this.handlePreResponse(preResponse);
  }

  protected async getPreResponseFromContext(
    context: RpcProxyContext
  ): Promise<NexusPreResponse> {
    if (context.httpMethod === "GET") {
      const status = await context.getStatus();

      return {
        status: status.code,
        body: status,
        type: "json",
      };
    } else if (context.httpMethod === "POST") {
      const result = await context.relay();

      return {
        status: result.status,
        body: result.body,
        type: "json",
      };
    }

    return {
      status: 404,
      body: {
        message: "Not Found",
      },
      type: "json",
    };
  }

  protected abstract getContext(): Promise<RpcProxyContext>;

  protected abstract handlePreResponse(
    response: NexusPreResponse
  ): ResponseReturnType;
}
