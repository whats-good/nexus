import type { Nexus } from "../nexus";
import type { RpcProxyContext } from "./rpc-proxy-context";

export interface NexusPreResponse {
  status: number;
  body: unknown;
  type: "json" | "text";
}

export abstract class AbstractRequestHandler<ResponseReturnType> {
  constructor(protected readonly nexus: Nexus) {}

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
