import type { RpcRequestPayload } from "@src/rpc";
import type { RpcEndpoint } from "./rpc-endpoint";
import type {
  RelayLegalErrorResponse,
  RelayResult,
  RelaySuccessResponse,
} from "./relay-result";
import { Logger } from "@src/logger";

// a config object that determines how to treat failed relay requests

export type RelayFailureConfig = CycleRequests | FailImmediately;

export interface CycleRequests {
  kind: "cycle-requests";
  maxAttempts: number;
}

export interface FailImmediately {
  kind: "fail-immediately";
}

export class RpcEndpointPool {
  private numAllowedAttempts: number;
  private numAttempts = 0;
  private currentEndpointIndex = 0;

  public readonly relayAttempts: RelayResult[] = [];

  constructor(
    public readonly endpoints: RpcEndpoint[],
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

  private getNextEndpoint(): RpcEndpoint | null {
    if (!this.hasNextEndpoint()) {
      return null;
    }

    const endpoint = this.endpoints[this.currentEndpointIndex];

    this.currentEndpointIndex += 1;

    return endpoint;
  }

  public async relay(
    request: RpcRequestPayload
  ): Promise<RelaySuccessResponse | null> {
    while (this.hasRemainingAttempts() && this.hasNextEndpoint()) {
      // we're using the ! operator here because we know that this.hasNextEndpoint() is true
      const endpoint = this.getNextEndpoint()!;

      this.numAttempts += 1;

      const relayResult = await endpoint.relay(request);

      this.relayAttempts.push(relayResult);

      if (relayResult.kind === "success-response") {
        return relayResult;
      }

      this.logger.warn(
        [
          "Relay failed.",
          `Provider: ${endpoint.serviceProvider.name}`,
          `Relay result: ${relayResult.stringify()}`,
        ].join("\n")
      );

      // TODO: how do we handle unexpected errors, as well as expected errors? How do we determine when to retry, and when to return the error as-is?
    }

    return null;
  }

  public getLatestLegalRelayError(): RelayLegalErrorResponse | null {
    for (let i = this.relayAttempts.length - 1; i >= 0; i--) {
      const relayAttempt = this.relayAttempts[i];

      if (relayAttempt.kind === "error-response") {
        return relayAttempt;
      }
    }

    return null;
  }
}
