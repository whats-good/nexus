import type { Logger } from "pino";
import type { Chain } from "@src/chain";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import { safeJsonStringify, weightedShuffle } from "@src/utils";
import type { StaticContainer } from "@src/dependency-injection";
import type { RelayConfig } from "./relay-config";
import {
  NodeEndpointPoolAllFailedResponse,
  NodeEndpointPoolSuccessResponse,
} from "./node-endpoint-pool-response";
import type { NodeEndpointPoolResponse } from "./node-endpoint-pool-response";
import type { NodeEndpoint } from "./node-endpoint";
import type { NodeRpcResponseFailure } from "./node-rpc-response";

export class NodeEndpointPool<TPlatformContext = unknown> {
  private readonly chain: Chain;
  private readonly nodeEndpoints: NodeEndpoint[];
  private readonly config: RelayConfig;
  private readonly logger: Logger;

  constructor(params: {
    chain: Chain;
    nodeEndpoints: NodeEndpoint[];
    container: StaticContainer<TPlatformContext>;
  }) {
    this.chain = params.chain;
    this.nodeEndpoints = params.nodeEndpoints;
    this.config = params.container.config.relay;
    this.logger = params.container.logger.child({
      name: this.constructor.name,
    });
  }

  private getAvailableNodeEndpoints(): NodeEndpoint[] {
    let nodeEndpoints = this.nodeEndpoints;

    if (this.config.order === "random") {
      nodeEndpoints = weightedShuffle(nodeEndpoints);
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
    const failures: NodeRpcResponseFailure[] = [];

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];

      this.logger.debug(
        safeJsonStringify({
          relayAttempt: i + 1,
          request,
          provider: `<${endpoint.nodeProvider.name}>`,
        })
      );
      const response = await endpoint.relay(request);

      response.log(this.logger);

      if (response.kind === "success-rpc-response") {
        return new NodeEndpointPoolSuccessResponse({
          chain: this.chain,
          request,
          success: response,
          failures,
        });
      }

      failures.push(response);
    }

    return new NodeEndpointPoolAllFailedResponse({
      chain: this.chain,
      request,
      failures,
    });
  }
}
