import type { NodeProvider } from "@src/node-provider";
import {
  RpcResponseErrorPayloadSchema,
  RpcResponseSuccessPayloadSchema,
  type RpcRequestPayloadType,
} from "@src/rpc-schema";
import {
  NodeRpcResponseError,
  NodeRpcResponseInternalFetchError,
  NodeRpcResponseNon200Response,
  NodeRpcResponseNonJsonResponse,
  NodeRpcResponseSuccess,
  NodeRpcResponseUnknown,
} from "./node-rpc-response";
import type { NodeRpcResponse } from "./node-rpc-response";

export class NodeEndpoint {
  public readonly nodeProvider: NodeProvider;

  constructor(params: { nodeProvider: NodeProvider }) {
    this.nodeProvider = params.nodeProvider;
  }

  public get weight(): number {
    return this.nodeProvider.weight;
  }

  public async relay(request: RpcRequestPayloadType): Promise<NodeRpcResponse> {
    let relayResponse: Response;

    try {
      const cleanedRequest = new Request(this.nodeProvider.url, {
        body: JSON.stringify(request),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      relayResponse = await fetch(cleanedRequest);
    } catch (error) {
      return new NodeRpcResponseInternalFetchError({
        request,
        error,
        endpoint: this,
      });
    }

    if (!relayResponse.ok) {
      return new NodeRpcResponseNon200Response({
        request,
        response: relayResponse,
        endpoint: this,
      });
    }

    let parsedJsonResponse: unknown;

    try {
      parsedJsonResponse = await relayResponse.json();
    } catch (error) {
      return new NodeRpcResponseNonJsonResponse({
        request,
        response: relayResponse,
        endpoint: this,
      });
    }

    const parsedSuccessResponse =
      RpcResponseSuccessPayloadSchema.safeParse(parsedJsonResponse);

    if (parsedSuccessResponse.success) {
      return new NodeRpcResponseSuccess({
        request,
        response: parsedSuccessResponse.data,
        endpoint: this,
      });
    }

    const parsedErrorResponse =
      RpcResponseErrorPayloadSchema.safeParse(parsedJsonResponse);

    if (parsedErrorResponse.success) {
      return new NodeRpcResponseError({
        request,
        response: parsedErrorResponse.data,
        endpoint: this,
      });
    }

    return new NodeRpcResponseUnknown({
      request,
      response: parsedJsonResponse,
      endpoint: this,
    });
  }
}
