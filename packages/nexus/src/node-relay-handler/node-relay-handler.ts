import type {
  NexusRpcContext,
  StaticContainer,
} from "@src/dependency-injection";
import type { NodeRpcResponseFailure } from "@src/node-endpoint/node-rpc-response";
import {
  InternalErrorResponse,
  NodeProviderReturnedInvalidResponse,
  NodeProviderReturnedNon200ErrorResponse,
  ProviderNotConfiguredErrorResponse,
  RpcErrorResponse,
  RpcSuccessResponse,
  type RpcResponse,
} from "@src/rpc-response";

export class NodeRelayHandler {
  constructor(private readonly container: StaticContainer) {}

  private handleFailureResponse(
    ctx: NexusRpcContext,
    failure: NodeRpcResponseFailure
  ) {
    switch (failure.kind) {
      case "error-rpc-response": {
        // TODO: make this a config: should we relay node provider failures to the client, without any
        // additional processing?
        return RpcErrorResponse.fromErrorResponsePayload(
          failure.response.error,
          ctx.requestId
        );
      }

      case "non-200-response": {
        return new NodeProviderReturnedNon200ErrorResponse(
          ctx.requestId,
          failure.endpoint.nodeProvider
        );
      }

      case "internal-fetch-error": {
        return new InternalErrorResponse(ctx.requestId);
      }

      case "non-json-response": {
        return new NodeProviderReturnedInvalidResponse(
          ctx.requestId,
          failure.endpoint.nodeProvider
        );
      }

      case "unknown-rpc-response": {
        return new NodeProviderReturnedInvalidResponse(
          ctx.requestId,
          failure.endpoint.nodeProvider
        );
      }

      default: {
        return new InternalErrorResponse(ctx.requestId);
      }
    }
  }

  public async handle(ctx: NexusRpcContext): Promise<RpcResponse> {
    const nodeEndpointPool = this.container.nodeEndpointPoolFactory.http.get(
      ctx.chain
    );

    if (!nodeEndpointPool) {
      return new ProviderNotConfiguredErrorResponse(ctx.requestId, ctx.chain);
    }

    // TODO: consider passing ctx and nodeEndpointPool as params to the handler instead of the constructor
    const poolResponse = await nodeEndpointPool.relay(ctx.rpcRequestPayload);

    if (poolResponse.kind === "success") {
      return new RpcSuccessResponse(
        ctx.requestId,
        poolResponse.success.response.result
      );
    }

    // all - failed
    const failureResponse =
      poolResponse.failures[poolResponse.failures.length - 1];

    return this.handleFailureResponse(ctx, failureResponse);
  }
}
