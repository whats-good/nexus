import type { Chain } from "@src/chain";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import { randomizeArray } from "@src/utils";
import type { RelayConfig } from "./relay-config";
import type { NodeRpcResponse } from "./node-rpc-response";
import {
  NodeEndpointPoolProviderNotFoundResponse,
  NodeEndpointPoolAllFailedResponse,
  NodeEndpointPoolSuccessResponse,
} from "./node-endpoint-pool-response";
import type { NodeEndpointPoolResponse } from "./node-endpoint-pool-response";
import type { NodeEndpoint } from ".";

export class NodeEndpointPool {
  private readonly nodeEndpoints: NodeEndpoint[];
  private readonly config: RelayConfig;

  constructor(params: { nodeEndpoints: NodeEndpoint[]; config: RelayConfig }) {
    this.nodeEndpoints = params.nodeEndpoints;
    this.config = params.config;
  }

  private getAvailableNodeEndpoints(): NodeEndpoint[] {
    let nodeEndpoints = this.nodeEndpoints;

    if (this.config.order === "random") {
      nodeEndpoints = randomizeArray(nodeEndpoints);
    }

    if (this.config.failure.kind === "fail-immediately") {
      return nodeEndpoints.slice(0, 1);
    }

    return nodeEndpoints.slice(0, this.config.failure.maxAttempts);
  }

  public async relay(
    chain: Chain,
    request: RpcRequestPayloadType
  ): Promise<NodeEndpointPoolResponse> {
    const endpoints = this.getAvailableNodeEndpoints();

    if (endpoints.length === 0) {
      return new NodeEndpointPoolProviderNotFoundResponse({
        chain,
        request,
      });
    }

    const failedResponses: {
      response: NodeRpcResponse;
      endpoint: NodeEndpoint;
    }[] = [];

    for (const endpoint of endpoints) {
      const response = await endpoint.relay(request);

      if (response.kind === "success-rpc-response") {
        return new NodeEndpointPoolSuccessResponse({
          chain,
          request,
          response,
          endpoint,
          failures: failedResponses,
        });
      }

      failedResponses.push({ response, endpoint });
    }

    return new NodeEndpointPoolAllFailedResponse({
      chain,
      request,
      failures: failedResponses,
    });
  }
}
