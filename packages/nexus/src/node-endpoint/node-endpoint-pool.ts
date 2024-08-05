import type { Logger } from "pino";
import type { Chain } from "@src/chain";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import { generatorOf, take, weightedShuffleGenerator } from "@src/utils";
import type { NexusConfig } from "@src/nexus-config";
import type { RelayConfig } from "./relay-config";
import {
  NodeEndpointPoolAllFailedResponse,
  NodeEndpointPoolSuccessResponse,
} from "./node-endpoint-pool-response";
import type { NodeEndpointPoolResponse } from "./node-endpoint-pool-response";
import type { NodeEndpoint } from "./node-endpoint";
import type {
  NodeRpcResponse,
  NodeRpcResponseFailure,
} from "./node-rpc-response";

// TODO: make injectable!
export class NodeEndpointPool {
  private readonly chain: Chain;
  private readonly nodeEndpoints: NodeEndpoint[];
  private readonly config: RelayConfig;
  private readonly logger: Logger;
  private readonly maxRelayAttempts: number = 1;

  constructor(params: {
    chain: Chain;
    config: NexusConfig;
    nodeEndpoints: NodeEndpoint[];
    logger: Logger;
  }) {
    this.chain = params.chain;
    this.nodeEndpoints = params.nodeEndpoints;
    this.config = params.config.relay;
    this.logger = params.logger;

    if (this.config.failure.kind === "cycle-requests") {
      this.maxRelayAttempts = this.config.failure.maxAttempts;
    }
  }

  // TODO: clean up this generator, give it a better name
  public *generator(): Generator<NodeEndpoint, void> {
    let innerGenerator: Generator<NodeEndpoint, void>;

    if (this.config.order === "random") {
      innerGenerator = weightedShuffleGenerator(this.nodeEndpoints);
    } else {
      innerGenerator = generatorOf(this.nodeEndpoints);
    }

    const outerGenerator = take(innerGenerator, this.maxRelayAttempts);

    for (const endpoint of outerGenerator) {
      yield endpoint;
    }
  }

  private logResponse(relayed: NodeRpcResponse) {
    const endpoint = `<${relayed.endpoint.nodeProvider.name}>`;
    const { request } = relayed;

    switch (relayed.kind) {
      case "success-rpc-response": {
        this.logger.info(
          {
            endpoint,
            request,
            response: relayed.response,
          },
          "Success response"
        );
        break;
      }

      case "error-rpc-response": {
        this.logger.warn(
          {
            endpoint,
            request,
            response: relayed.response,
          },
          "Error response"
        );
        break;
      }

      case "internal-fetch-error": {
        this.logger.error(
          {
            endpoint,
            request,
            error: relayed.error,
          },
          "Internal fetch error"
        );
        break;
      }

      case "non-200-response": {
        this.logger.warn(
          {
            endpoint,
            request,
            response: relayed.response,
          },
          "Non-200 response"
        );
        break;
      }

      case "non-json-response": {
        this.logger.warn(
          {
            endpoint,
            request,
            response: relayed.response,
          },
          "Non-JSON response"
        );
        break;
      }

      case "unknown-rpc-response": {
        this.logger.error(
          {
            endpoint,
            request,
            response: relayed.response,
          },
          "Unknown response"
        );
        break;
      }
    }
  }

  // TODO: pull this out of the endpoint pool, and place into the http-relay-handler.
  // node-endpoint-pool should only be responsible for cycling through the endpoints.
  public async relay(
    request: RpcRequestPayloadType
  ): Promise<NodeEndpointPoolResponse> {
    const failures: NodeRpcResponseFailure[] = [];
    let attempt = 0;

    for (const endpoint of this.generator()) {
      attempt += 1;
      this.logger.debug(
        {
          relayAttempt: attempt,
          request,
          provider: `<${endpoint.nodeProvider.name}>`,
        },
        `Relaying request.`
      );
      const relayed = await endpoint.relay(request);

      this.logResponse(relayed);

      // TODO: remove this .log function from the response class

      if (relayed.kind === "success-rpc-response") {
        return new NodeEndpointPoolSuccessResponse({
          chain: this.chain,
          request,
          success: relayed,
          failures,
        });
      }

      failures.push(relayed);
    }

    return new NodeEndpointPoolAllFailedResponse({
      chain: this.chain,
      request,
      failures,
    });
  }
}
