import type * as http from "node:http";
import NodeURL from "node:url";
import querystring from "node:querystring";
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

  private parseJSONFromNodeHttpRequest(req: http.IncomingMessage) {
    // TODO: is any the right choice?
    // TODO: test
    const body: any[] = [];
    let receivedSize = 0;
    const maxSize = 1e6; // 1 MB, for example

    return new Promise((resolve, reject) => {
      req.on("data", (chunk) => {
        receivedSize += chunk.length;

        if (receivedSize > maxSize) {
          reject(new Error("Payload too large"));
          req.destroy();
        } else {
          body.push(chunk);
        }
      });

      req.on("end", () => {
        try {
          const parsedBody: unknown = JSON.parse(
            Buffer.concat(body).toString()
          );

          resolve(parsedBody);
        } catch (error) {
          reject(new Error("Invalid JSON"));
        }
      });

      req.on("error", (error) => {
        reject(error);
      });
    });
  }

  private async parseJSONRpcRequestFromNodeHttpRequest(
    req: http.IncomingMessage
  ) {
    let payload: unknown;

    try {
      // TODO: cover the cases where the request is not a json rpc request
      // TODO: cover the cases where the request is already parsed as a json object
      // from a higher middleware
      payload = await this.parseJSONFromNodeHttpRequest(req);
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            req,
            error,
          },
          null,
          2
        )
      );

      return {
        type: "invalid-json-request",
        req,
        error,
      } as const;
    }

    try {
      console.log("PAYLOAD:", payload);

      const parsedPayload = JsonRPCRequestSchema.safeParse(payload);

      if (!parsedPayload.success) {
        console.log("HELLO!");
        console.log("error parsing json rpc request", payload);
        console.error(parsedPayload.error);

        return {
          type: "invalid-json-rpc-request",
          req,
          payload,
          error: parsedPayload.error,
        } as const;
      }

      return {
        type: "success",
        req,
        data: parsedPayload.data,
      } as const;
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            req,
            error,
          },
          null,
          2
        )
      );

      return {
        type: "invalid-json-request",
        req,
        error,
      } as const;
    }
  }

  private async parseJSONRpcRequestFromFetchRequest(request: Request) {
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

  private async buildContextFromFetchRequest(
    request: Request
  ): Promise<RpcProxyContext> {
    const requestUrl = new URL(request.url);
    const requestPath = requestUrl.pathname;

    const route = matchPath(requestUrl.pathname);
    const chain = route
      ? this.chainRegistry.getByOptionalParams(route.params)
      : undefined;
    const pool = chain ? this.endpointFactory.fromChain(chain) : undefined;

    const jsonRPCRequestParseResult =
      await this.parseJSONRpcRequestFromFetchRequest(request);

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

  private async buildContextFromNodeHttpRequest(
    req: http.IncomingMessage
  ): Promise<RpcProxyContext> {
    // TODO: test node http requests
    console.log("URL:", req.url);
    const requestUrl = NodeURL.parse(req.url || "");
    const requestPath = requestUrl.pathname;
    const { query } = requestUrl;

    const route = requestPath ? matchPath(requestPath) : undefined;
    const chain = route
      ? this.chainRegistry.getByOptionalParams(route.params)
      : undefined;
    const pool = chain ? this.endpointFactory.fromChain(chain) : undefined;

    console.log({
      chain,
      route,
      pool,
    });

    const clientAccessKey = query ? querystring.parse(query).key : undefined;

    const jsonRPCRequestParseResult =
      await this.parseJSONRpcRequestFromNodeHttpRequest(req);

    return new RpcProxyContext({
      pool,
      config: this.config,
      chain,
      path: requestPath || "", // TODO: remove this hack, make this more robust
      clientAccessKey:
        typeof clientAccessKey === "string" ? clientAccessKey : undefined,
      jsonRPCRequest:
        jsonRPCRequestParseResult.type === "success"
          ? jsonRPCRequestParseResult.data
          : undefined,
    });
  }

  private async handleStatus(context: RpcProxyContext) {
    const status = await context.getStatus();

    return {
      status: status.code,
      body: status,
    };
  }

  public async handleFetch(request: Request): Promise<Response> {
    const context = await this.buildContextFromFetchRequest(request);

    if (request.method === "GET") {
      const responseRaw = await this.handleStatus(context);

      return Response.json(responseRaw.body, { status: responseRaw.status });
    } else if (request.method === "POST") {
      const result = await context.relay();

      return Response.json(result.body, { status: result.status });
    }

    return Response.json(
      {
        message: "Not Found",
      },
      { status: 404 }
    );
  }

  public async handleNodeHttp(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    const context = await this.buildContextFromNodeHttpRequest(req);

    if (req.method === "GET") {
      const status = await context.getStatus();

      res.writeHead(status.code, {
        "Content-Type": "application/json",
      });

      res.end(JSON.stringify(status));
    } else if (req.method === "POST") {
      const result = await context.relay();

      res.writeHead(result.status, {
        "Content-Type": "application/json",
      });

      res.end(JSON.stringify(result.body));
    } else {
      res.writeHead(404, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          message: "Not Found",
        })
      );
    }
  }
}
