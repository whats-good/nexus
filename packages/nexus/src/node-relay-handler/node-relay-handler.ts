import type { Logger } from "pino";
import type { NexusRpcContext } from "@src/dependency-injection";
import type { NodeEndpointPool } from "@src/node-endpoint";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import {
  InternalErrorResponse,
  NodeProviderReturnedInvalidResponse,
  NodeProviderReturnedNon200ErrorResponse,
  RpcErrorResponse,
  RpcSuccessResponse,
  type RpcResponse,
} from "@src/rpc-response";

export class NodeRelayHandler<TPlatformContext = unknown> {
  private readonly nodeEndpointPool: NodeEndpointPool;
  private readonly rpcRequestPayload: RpcRequestPayloadType;
  private readonly requestId: string | number | null;
  private readonly logger: Logger;
  private readonly ctx: NexusRpcContext<TPlatformContext>;

  constructor(ctx: NexusRpcContext<TPlatformContext>) {
    this.ctx = ctx;
    this.nodeEndpointPool = ctx.nodeEndpointPool;
    this.rpcRequestPayload = ctx.rpcRequestPayload;
    this.requestId = ctx.requestId;
    this.logger = ctx.container.logger.child({ name: this.constructor.name });

    this.logger.debug(ctx.rpcRequestPayload);
  }

  public async handle(): Promise<RpcResponse> {
    const poolResponse = await this.nodeEndpointPool.relay(
      this.rpcRequestPayload
    );

    if (poolResponse.kind === "success") {
      return new RpcSuccessResponse(
        this.requestId,
        poolResponse.success.response.result
      );
    }

    // all - failed
    const lastFailure = poolResponse.failures[poolResponse.failures.length - 1];
    const failureResponse = lastFailure.failure;

    if (failureResponse.kind === "error-rpc-response") {
      // TODO: make this a config: should we relay node provider failures to the client, without any
      // additional processing?
      return RpcErrorResponse.fromErrorResponsePayload(
        failureResponse.response.error,
        this.requestId
      );
    } else if (failureResponse.kind === "non-200-response") {
      return new NodeProviderReturnedNon200ErrorResponse(
        this.requestId,
        lastFailure.endpoint.nodeProvider
      );
    } else if (failureResponse.kind === "internal-fetch-error") {
      return new InternalErrorResponse(this.requestId);
    } else if (failureResponse.kind === "non-json-response") {
      return new NodeProviderReturnedInvalidResponse(
        this.requestId,
        lastFailure.endpoint.nodeProvider
      );
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- disabling, because we'll likely introduce additional failure types
    } else if (failureResponse.kind === "unknown-rpc-response") {
      return new NodeProviderReturnedInvalidResponse(
        this.requestId,
        lastFailure.endpoint.nodeProvider
      );
    }

    return new InternalErrorResponse(this.rpcRequestPayload.id || null);
  }
}
