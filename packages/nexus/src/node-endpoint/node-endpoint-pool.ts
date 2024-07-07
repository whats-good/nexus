import type { Logger } from "pino";
import type { Chain } from "@src/chain";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import {
  generatorOf,
  safeJsonStringify,
  take,
  weightedShuffleGenerator,
} from "@src/utils";
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
  private readonly maxRelayAttempts: number = 1;

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

    if (this.config.failure.kind === "cycle-requests") {
      this.maxRelayAttempts = this.config.failure.maxAttempts;
    }
  }

  private getNextEndpoint(): Generator<NodeEndpoint> {
    let innerGenerator: Generator<NodeEndpoint>;

    if (this.config.order === "random") {
      innerGenerator = weightedShuffleGenerator(this.nodeEndpoints);
    } else {
      innerGenerator = generatorOf(this.nodeEndpoints);
    }

    return take(innerGenerator, this.maxRelayAttempts);
  }

  public async connect() {
    const failures = [];

    for (const endpoint of this.getNextEndpoint()) {
      try {
        const ws = await endpoint.connect();

        return {
          kind: "success" as const,
          ws,
        };
      } catch (error) {
        failures.push(error);
        this.logger.warn(
          safeJsonStringify({
            error,
            message: "Failed to connect to ws endpoint",
            provider: `<${endpoint.nodeProvider.name}>`,
          })
        );
      }
    }

    return {
      kind: "failure" as const,
      failures,
    };
  }

  public async relay(
    request: RpcRequestPayloadType
  ): Promise<NodeEndpointPoolResponse> {
    const failures: NodeRpcResponseFailure[] = [];
    let attempt = 0;

    for (const endpoint of this.getNextEndpoint()) {
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
