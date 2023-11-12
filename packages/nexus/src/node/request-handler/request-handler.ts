import type http from "node:http";
import NodeURL from "node:url";
import querystring from "node:querystring";
import type { Config } from "../../lib/config";
import type { ChainRegistry } from "../../lib/chain/chain-registry";
import { matchPath } from "../../lib/routes";
import { JsonRPCRequestSchema } from "../../lib/rpc-endpoint/json-rpc-types";
import type { RpcEndpointPoolFactory } from "../../lib/rpc-endpoint/rpc-endpoint-pool-factory";
import type { Nexus } from "../../lib/nexus";
import { RpcProxyContext } from "../../lib/request-handler/rpc-proxy-context";
import type { NexusPreResponse } from "../../lib/request-handler/abstract-request-handler";
import { AbstractRequestHandler } from "../../lib/request-handler/abstract-request-handler";

export class RequestHandler extends AbstractRequestHandler<void> {
  private readonly req: http.IncomingMessage;
  private readonly res: http.ServerResponse;

  constructor(params: {
    config: Config;
    chainRegistry: ChainRegistry;
    rpcEndpointPoolFactory: RpcEndpointPoolFactory;
    req: http.IncomingMessage;
    res: http.ServerResponse;
  }) {
    super(params);
    this.req = params.req;
    this.res = params.res;
  }

  public static init(
    nexus: Nexus,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    return new RequestHandler({
      config: nexus.config,
      chainRegistry: nexus.chainRegistry,
      rpcEndpointPoolFactory: nexus.rpcEndpointPoolFactory,
      req,
      res,
    });
  }

  protected handlePreResponse(preResponse: NexusPreResponse) {
    if (preResponse.type === "json") {
      this.res.writeHead(preResponse.status, {
        "Content-Type": "application/json",
      });
      this.res.end(JSON.stringify(preResponse.body));
    } else {
      console.error(preResponse);
      const message = `Unsupported response type: ${preResponse.type}`;
      const error = new Error(message);

      this.handle500(error, message);
    }
  }

  public handle500(error: unknown, message?: string) {
    console.error(error);
    this.res.writeHead(500, {
      "Content-Type": "application/json",
    });
    this.res.end(
      JSON.stringify({ message: message ?? "Internal Server Error" })
    );
  }

  private parseJSONFromNodeHttpRequest() {
    // TODO: is any the right choice?
    // TODO: test
    const body: any[] = [];
    let receivedSize = 0;
    const maxSize = 1e6; // 1 MB, for example

    return new Promise((resolve, reject) => {
      this.req.on("data", (chunk) => {
        receivedSize += chunk.length;

        if (receivedSize > maxSize) {
          reject(new Error("Payload too large"));
          this.req.destroy();
        } else {
          body.push(chunk);
        }
      });

      this.req.on("end", () => {
        try {
          const parsedBody: unknown = JSON.parse(
            Buffer.concat(body).toString()
          );

          resolve(parsedBody);
        } catch (error) {
          reject(new Error("Invalid JSON"));
        }
      });

      this.req.on("error", (error) => {
        reject(error);
      });
    });
  }

  private async parseJSONRpcRequest() {
    let payload: unknown;

    try {
      // TODO: cover the cases where the request is not a json rpc request
      // TODO: cover the cases where the request is already parsed as a json object
      // from a higher middleware
      payload = await this.parseJSONFromNodeHttpRequest();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            req: this.req,
            error,
          },
          null,
          2
        )
      );

      return {
        type: "invalid-json-request",
        req: this.req,
        error,
      } as const;
    }

    try {
      const parsedPayload = JsonRPCRequestSchema.safeParse(payload);

      if (!parsedPayload.success) {
        console.log("error parsing json rpc request", payload);
        console.error(parsedPayload.error);

        return {
          type: "invalid-json-rpc-request",
          req: this.req,
          payload,
          error: parsedPayload.error,
        } as const;
      }

      return {
        type: "success",
        req: this.req,
        data: parsedPayload.data,
      } as const;
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            req: this.req,
            error,
          },
          null,
          2
        )
      );

      return {
        type: "invalid-json-request",
        req: this.req,
        error,
      } as const;
    }
  }

  protected async getContext(): Promise<RpcProxyContext> {
    // TODO: test node http requests
    const requestUrl = NodeURL.parse(this.req.url || "");
    const requestPath = requestUrl.pathname;
    const { query } = requestUrl;

    const route = requestPath ? matchPath(requestPath) : undefined;
    const chain = route
      ? this.chainRegistry.getByOptionalParams(route.params)
      : undefined;
    const pool = chain
      ? this.rpcEndpointPoolFactory.fromChain(chain)
      : undefined;

    const clientAccessKey = query ? querystring.parse(query).key : undefined;

    const jsonRPCRequestParseResult = await this.parseJSONRpcRequest();

    return new RpcProxyContext({
      pool,
      config: this.config,
      httpMethod: this.req.method,
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
}
