import { Response } from "@whatwg-node/fetch";
import { matchPath } from "@src/routes";
import { JsonRPCRequestSchema } from "@src/rpc-endpoint/json-rpc-types";
import { RpcEndpointPoolFactory } from "@src/rpc-endpoint/rpc-endpoint-pool-factory";
import type { Config, Logger } from "@src/config";
import { RpcProxyContext } from "./rpc-proxy-context";

export interface NexusPreResponse {
  status: number;
  body: unknown;
  type: "json" | "text";
}

export class RequestHandler {
  private readonly config: Config;
  private readonly logger: Logger;
  private readonly request: Request;

  constructor(config: Config, request: Request) {
    this.config = config;
    this.logger = config.logger;
    this.request = request;
  }

  public async handle(): Promise<Response> {
    this.logger.info("building context...");
    const context = await this.getContext();

    this.logger.info("context built...");

    if (context.jsonRPCRequest) {
      this.logger.info("jsonRPCRequest received");
      this.logger.info(JSON.stringify(context.jsonRPCRequest, null, 2));
    }

    this.logger.info("getting response from context...");
    const response = await this.getResponseFromContext(context);

    this.logger.info("response received. returning...");

    return response;
  }

  private async getResponseFromContext(
    context: RpcProxyContext
  ): Promise<Response> {
    if (context.request.method === "GET") {
      const status = await context.getStatus();

      this.logger.info("status: ");
      this.logger.info(JSON.stringify(status, null, 2));

      return Response.json(status, {
        status: status.code,
      });
    } else if (context.request.method === "POST") {
      const result = await context.relay();

      this.logger.info("result: ");
      const statusFirstDigit = Math.floor(result.status / 100);

      if (statusFirstDigit === 4 || statusFirstDigit === 5) {
        this.logger.error(JSON.stringify(result, null, 2));
      } else {
        this.logger.info(JSON.stringify(result, null, 2));
      }

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

  private async parseJSONRpcRequest() {
    // we clean the request to remove any non-required pieces
    let payload: unknown;

    try {
      payload = await this.request.json();
    } catch (error) {
      this.logger.error(
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
      this.logger.error(JSON.stringify(parsedPayload.error, null, 2));

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

  private async getContext(): Promise<RpcProxyContext> {
    const requestUrl = new URL(this.request.url);

    const route = matchPath(requestUrl.pathname);
    const rpcEndpointPoolFactory = new RpcEndpointPoolFactory(this.config);
    const chain = route
      ? this.config.registry.getChainByOptionalParams(route.params)
      : undefined;
    const pool = chain ? rpcEndpointPoolFactory.fromChain(chain) : undefined;

    const jsonRPCRequestParseResult = await this.parseJSONRpcRequest();

    return new RpcProxyContext({
      pool,
      chain,
      config: this.config,
      request: this.request,
      jsonRPCRequest:
        jsonRPCRequestParseResult.type === "success"
          ? jsonRPCRequestParseResult.data
          : undefined,
    });
  }
}
