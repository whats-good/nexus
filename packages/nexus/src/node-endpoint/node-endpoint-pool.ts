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

  // TODO: turn this into a generator, which should decrease the cost of
  // the weighted shuffle operation.
  private getAvailableNodeEndpoints(): NodeEndpoint[] {
    let nodeEndpoints = this.nodeEndpoints;
    let maxAttempts = 1;

    if (this.config.failure.kind === "cycle-requests") {
      maxAttempts = this.config.failure.maxAttempts;
    }

    if (this.config.order === "random") {
      nodeEndpoints = weightedShuffle(nodeEndpoints);
    }

    const finalEndpoints = nodeEndpoints.slice(0, maxAttempts);

    return finalEndpoints;
  }

  public async relay(
    request: RpcRequestPayloadType
  ): Promise<NodeEndpointPoolResponse> {
    const endpoints = this.getAvailableNodeEndpoints();
    const failures: NodeRpcResponseFailure[] = [];
    let attempt = 0;

    for (const endpoint of endpoints) {
      attempt += 1;
      this.logger.debug(
        safeJsonStringify({
          relayAttempt: attempt,
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
