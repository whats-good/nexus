import type { Chain } from "@src/chain";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import { randomizeArray } from "@src/utils";
import type { RelayConfig } from "./relay-config";
import {
  NodeEndpointPoolAllFailedResponse,
  NodeEndpointPoolSuccessResponse,
} from "./node-endpoint-pool-response";
import type {
  EndpointResponseFailurePair,
  NodeEndpointPoolResponse,
} from "./node-endpoint-pool-response";
import type { NodeEndpoint } from ".";

export class NodeEndpointPool {
  private readonly chain: Chain;
  private readonly nodeEndpoints: NodeEndpoint[];
  private readonly config: RelayConfig;

  constructor(params: {
    chain: Chain;
    nodeEndpoints: NodeEndpoint[];
    config: RelayConfig;
  }) {
    this.chain = params.chain;
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
    request: RpcRequestPayloadType
  ): Promise<NodeEndpointPoolResponse> {
    const endpoints = this.getAvailableNodeEndpoints();
    const failedResponses: EndpointResponseFailurePair[] = [];

    for (const endpoint of endpoints) {
      const response = await endpoint.relay(request);

      if (response.kind === "success-rpc-response") {
        return new NodeEndpointPoolSuccessResponse({
          chain: this.chain,
          request,
          success: response,
          endpoint,
          failures: failedResponses,
        });
      }

      failedResponses.push({ failure: response, endpoint });
    }

    return new NodeEndpointPoolAllFailedResponse({
      chain: this.chain,
      request,
      failures: failedResponses,
    });
  }
}
