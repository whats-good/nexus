import type { Logger } from "pino";
import type { NodeProvider } from "@src/node-provider";
import {
  RpcResponseErrorPayloadSchema,
  RpcResponseSuccessPayloadSchema,
  type RpcRequestPayloadType,
} from "@src/rpc-schema";
import type { StaticContainer } from "@src/dependency-injection";
import { safeErrorStringify, safeJsonStringify } from "@src/utils";
import {
  NodeRpcResponseError,
  NodeRpcResponseInternalFetchError,
  NodeRpcResponseNon200Response,
  NodeRpcResponseNonJsonResponse,
  NodeRpcResponseSuccess,
  NodeRpcResponseUnknown,
} from "./node-rpc-response";
import type { NodeRpcResponse } from "./node-rpc-response";

export class NodeEndpoint<TPlatformContext = unknown> {
  public readonly nodeProvider: NodeProvider;
  private readonly logger: Logger;

  constructor(params: {
    nodeProvider: NodeProvider;
    container: StaticContainer<TPlatformContext>;
  }) {
    this.nodeProvider = params.nodeProvider;
    this.logger = params.container.logger.child({
      name: this.constructor.name,
    });
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
      const errorMessage = safeErrorStringify(error);

      this.logger.error(
        `Error fetching from node provider with name ${this.nodeProvider.name}. error: ${errorMessage}`
      );

      return new NodeRpcResponseInternalFetchError({
        request,
      });
    }

    if (!relayResponse.ok) {
      this.logger.warn(
        `Non-200 response from node provider with name ${
          this.nodeProvider.name
        }. response: ${safeJsonStringify(relayResponse)}`
      );

      return new NodeRpcResponseNon200Response({
        request,
        response: relayResponse,
      });
    }

    let parsedJsonResponse: unknown;

    try {
      parsedJsonResponse = await relayResponse.json();
    } catch (error) {
      this.logger.warn(
        `Non-JSON response from node provider with name ${
          this.nodeProvider.name
        }. response: ${safeJsonStringify(relayResponse)}`
      );

      return new NodeRpcResponseNonJsonResponse({
        request,
        response: relayResponse,
      });
    }

    const parsedSuccessResponse =
      RpcResponseSuccessPayloadSchema.safeParse(parsedJsonResponse);

    if (parsedSuccessResponse.success) {
      this.logger.debug(
        `Successfully relayed request to node provider with name ${
          this.nodeProvider.name
        }. response: ${safeJsonStringify(parsedSuccessResponse.data)}`
      );

      return new NodeRpcResponseSuccess({
        request,
        response: parsedSuccessResponse.data,
      });
    }

    const parsedErrorResponse =
      RpcResponseErrorPayloadSchema.safeParse(parsedJsonResponse);

    if (parsedErrorResponse.success) {
      this.logger.warn(
        `Error response from node provider with name ${
          this.nodeProvider.name
        }. response: ${safeJsonStringify(parsedErrorResponse.data)}`
      );

      return new NodeRpcResponseError({
        request,
        response: parsedErrorResponse.data,
      });
    }

    this.logger.error(
      `Unknown response from node provider with name ${
        this.nodeProvider.name
      }. response: ${safeJsonStringify(parsedJsonResponse)}`
    );

    return new NodeRpcResponseUnknown({
      request,
      response: parsedJsonResponse,
    });
  }
}
