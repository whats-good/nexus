import { matchPath } from "@src/routes";
import { JsonRPCRequestSchema } from "@src/rpc-endpoint/json-rpc-types";
import { RpcEndpointPoolFactory } from "@src/rpc-endpoint/rpc-endpoint-pool-factory";
import type { Config } from "@src/config";
import { RpcProxyContext } from "./rpc-proxy-context";

export interface NexusPreResponse {
  status: number;
  body: unknown;
  type: "json" | "text";
}

export class RequestHandler {
  public async handle(config: Config, request: Request): Promise<Response> {
    console.info("building context...");
    const context = await this.getContext(config, request);

    console.info("context built...");

    if (context.jsonRPCRequest) {
      console.info("jsonRPCRequest received");
      console.info(JSON.stringify(context.jsonRPCRequest, null, 2));
    }

    console.info("getting response from context...");
    const response = await this.getResponseFromContext(context);

    console.info("response received. returning...");

    return response;
  }

  private async getResponseFromContext(
    context: RpcProxyContext
  ): Promise<Response> {
    if (context.request.method === "GET") {
      const status = await context.getStatus();

      console.info("status", JSON.stringify(status, null, 2));

      return Response.json(status, {
        status: status.code,
      });
    } else if (context.request.method === "POST") {
      const result = await context.relay();

      console.info("result", JSON.stringify(result, null, 2));

      return Response.json(result.body, {
        status: result.status,
      });
    }

    return Response.json(
      {
        message: "Method Not Allowed",
      },
      {
        status: 405,
      }
    );
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

  private async getContext(
    config: Config,
    request: Request
  ): Promise<RpcProxyContext> {
    const requestUrl = new URL(request.url);

    const route = matchPath(requestUrl.pathname);
    const rpcEndpointPoolFactory = new RpcEndpointPoolFactory(config);
    const chain = route
      ? config.chainRegistry.getByOptionalParams(route.params)
      : undefined;
    const pool = chain ? rpcEndpointPoolFactory.fromChain(chain) : undefined;

    const jsonRPCRequestParseResult = await this.parseJSONRpcRequest(request);

    return new RpcProxyContext({
      pool,
      chain,
      config,
      request,
      jsonRPCRequest:
        jsonRPCRequestParseResult.type === "success"
          ? jsonRPCRequestParseResult.data
          : undefined,
    });
  }
}
