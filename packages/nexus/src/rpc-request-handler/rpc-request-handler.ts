import type { Logger } from "pino";
import type { NexusRpcContext } from "@src/dependency-injection";
import type { NodeEndpointPool } from "@src/node-endpoint";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import {
  InternalErrorResponse,
  NodeProviderReturnedNon200ErrorResponse,
  RpcErrorResponse,
  RpcSuccessResponse,
  type RpcResponse,
} from "./rpc-response";

export class RpcRequestHandler {
  private readonly nodeEndpointPool: NodeEndpointPool;
  private readonly rpcRequestPayload: RpcRequestPayloadType;
  private readonly requestId: string | number | null;
  private readonly logger: Logger;

  constructor(ctx: NexusRpcContext) {
    this.nodeEndpointPool = ctx.nodeEndpointPool;
    this.rpcRequestPayload = ctx.rpcRequestPayload;
    this.requestId = ctx.requestId;
    this.logger = ctx.parent.logger.child({ name: this.constructor.name });

    this.logger.debug(ctx.rpcRequestPayload);
  }

  public async handle(): Promise<RpcResponse> {
    const poolResponse = await this.nodeEndpointPool.relay(
      this.rpcRequestPayload
    );

    if (poolResponse.kind === "success") {
      return new RpcSuccessResponse(
        this.requestId,
        poolResponse.success.response.result // TODO: make this simpler. too many .response.response.response
      );
    }

    // all -failed
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
    }

    console.error("Unhandled failure response kind", failureResponse);

    // TODO: see if these cases require deeper handling, such as digging into errors and logging things
    return new InternalErrorResponse(this.rpcRequestPayload.id || null);
  }
}
