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
    console.info("building context...");
    const context = await this.getContext();

    console.info("context built...");

    if (context.jsonRPCRequest) {
      console.info("jsonRPCRequest received");
      console.info(JSON.stringify(context.jsonRPCRequest, null, 2));
    }

    const preResponse = await this.getPreResponseFromContext(context);

    if (context.relayResult) {
      console.info("relayResult received");
      console.info(JSON.stringify(context.relayResult, null, 2));
    }

    console.info("preResponse received");
    console.info(JSON.stringify(preResponse, null, 2));

    console.info("preparing final response...");
    const response = this.handlePreResponse(preResponse);

    console.info("final response prepared. returning response...");

    return response;
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
