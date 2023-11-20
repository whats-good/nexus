import { matchPath } from "@src/routes";
import { JsonRPCRequestSchema } from "@src/rpc-endpoint/json-rpc-types";
import type { Nexus } from "../nexus";
import { RpcProxyContext } from "./rpc-proxy-context";

export interface NexusPreResponse {
  status: number;
  body: unknown;
  type: "json" | "text";
}

export class RequestHandler {
  constructor(
    private readonly nexus: Nexus,
    private readonly request: Request
  ) {}

  public async handle(): Promise<Response> {
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
      ? this.nexus.chainRegistry.getByOptionalParams(route.params)
      : undefined;
    const pool = chain
      ? this.nexus.rpcEndpointPoolFactory.fromChain(chain)
      : undefined;

    const jsonRPCRequestParseResult = await this.parseJSONRpcRequest();

    const clientAccessKey = requestUrl.searchParams.get("key") || undefined;

    return new RpcProxyContext({
      pool,
      config: this.nexus.config,
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