import { injectable } from "inversify";
import type { NexusRpcContext } from "@src/nexus-rpc-context";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";
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

@injectable()
export class HttpRelayHandler {
  constructor(
    private readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory
  ) {}

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
          ctx.request.id
        );
      }

      case "non-200-response": {
        return new NodeProviderReturnedNon200ErrorResponse(
          ctx.request.id,
          failure.endpoint.nodeProvider
        );
      }

      case "internal-fetch-error": {
        return new InternalErrorResponse(ctx.request.id);
      }

      case "non-json-response": {
        return new NodeProviderReturnedInvalidResponse(
          ctx.request.id,
          failure.endpoint.nodeProvider
        );
      }

      case "unknown-rpc-response": {
        return new NodeProviderReturnedInvalidResponse(
          ctx.request.id,
          failure.endpoint.nodeProvider
        );
      }

      default: {
        return new InternalErrorResponse(ctx.request.id);
      }
    }
  }

  public async handle(ctx: NexusRpcContext): Promise<RpcResponse> {
    const nodeEndpointPool = this.nodeEndpointPoolFactory.http.get(ctx.chain);

    if (!nodeEndpointPool) {
      return new ProviderNotConfiguredErrorResponse(ctx.request.id, ctx.chain);
    }

    const poolResponse = await nodeEndpointPool.relay(ctx.request);

    if (poolResponse.kind === "success") {
      return new RpcSuccessResponse(
        ctx.request.id,
        poolResponse.success.response.result
      );
    }

    // all - failed
    const failureResponse =
      poolResponse.failures[poolResponse.failures.length - 1];

    return this.handleFailureResponse(ctx, failureResponse);
  }
}
