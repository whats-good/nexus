import type { Logger } from "pino";
import type { RpcRequestPayload } from "../rpc/schemas";
import type { Endpoint } from "./endpoint";

// a config object that determines how to treat failed relay requests

export type RelayFailureConfig = CycleRequests | FailImmediately;

export interface CycleRequests {
  kind: "cycle-requests";
  maxAttempts: number;
}

export interface FailImmediately {
  kind: "fail-immediately";
}

export class EndpointPool {
  private numAllowedAttempts: number;
  private numAttempts = 0;
  private currentEndpointIndex = 0;

  constructor(
    public readonly endpoints: Endpoint[],
    public readonly failureConfig: RelayFailureConfig,
    private readonly logger: Logger
  ) {
    this.numAllowedAttempts =
      this.failureConfig.kind === "cycle-requests"
        ? this.failureConfig.maxAttempts
        : 1;
  }

  private hasNextEndpoint() {
    return this.currentEndpointIndex < this.endpoints.length;
  }

  private hasRemainingAttempts() {
    return this.numAttempts < this.numAllowedAttempts;
  }

  private getNextEndpoint(): Endpoint | null {
    if (!this.hasNextEndpoint()) {
      return null;
    }

    const endpoint = this.endpoints[this.currentEndpointIndex];

    this.currentEndpointIndex += 1;

    return endpoint;
  }

  public async relay(request: RpcRequestPayload) {
    while (this.hasRemainingAttempts() && this.hasNextEndpoint()) {
      // we're using the ! operator here because we know that this.hasNextEndpoint() is true
      const endpoint = this.getNextEndpoint()!;

      this.numAttempts += 1;

      const relayResult = await endpoint.relay(request);

      if (relayResult.kind === "success-response") {
        return relayResult;
      }

      // TODO: how do we handle unexpected errors, as well as expected errors? How do we determine when to retry, and when to return the error as-is?
    }
  }
}
