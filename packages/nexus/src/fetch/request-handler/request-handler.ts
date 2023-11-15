import { JsonRPCRequestSchema } from "@lib/rpc-endpoint/json-rpc-types";
import type { Nexus } from "@lib/nexus";
import { RpcProxyContext } from "@lib/request-handler/rpc-proxy-context";
import type { NexusPreResponse } from "@lib/request-handler/abstract-request-handler";
import { AbstractRequestHandler } from "@lib/request-handler/abstract-request-handler";
import { matchPath } from "@lib/routes";

export class RequestHandler extends AbstractRequestHandler<Response> {
  constructor(
    protected readonly nexus: Nexus,
    private readonly request: Request
  ) {
    super(nexus);
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
