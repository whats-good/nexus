import { EventEmitter } from "eventemitter3";
import { Lifecycle, scoped } from "tsyringe";
import type { RpcErrorResponse, RpcSuccessResponse } from "@src/rpc-response";
import type { NexusRpcContext } from "@src/nexus-rpc-context";

@scoped(Lifecycle.ContainerScoped)
export class EventBus extends EventEmitter<{
  rpcResponseSuccess: (
    response: RpcSuccessResponse,
    ctx: NexusRpcContext
  ) => void;
  rpcResponseError: (response: RpcErrorResponse, ctx: NexusRpcContext) => void;
}> {}
