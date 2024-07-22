import { EventEmitter } from "eventemitter3";
import type { NexusRpcContext } from "@src/dependency-injection";
import type { RpcErrorResponse, RpcSuccessResponse } from "@src/rpc-response";

export class EventBus<TPlatformContext = unknown> extends EventEmitter<{
  rpcResponseSuccess: (
    response: RpcSuccessResponse,
    ctx: NexusRpcContext<TPlatformContext>
  ) => void;
  rpcResponseError: (
    response: RpcErrorResponse,
    ctx: NexusRpcContext<TPlatformContext>
  ) => void;
}> {
  private readonly ctx: NexusRpcContext<TPlatformContext>;

  constructor(params: { ctx: NexusRpcContext<TPlatformContext> }) {
    super();
    this.ctx = params.ctx;
  }
}
