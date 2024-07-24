import { EventEmitter } from "eventemitter3";
import type { RpcErrorResponse, RpcSuccessResponse } from "@src/rpc-response";
import type { NexusRpcContext } from "@src/nexus-rpc-context";

export class EventBus extends EventEmitter<{
  rpcResponseSuccess: (
    response: RpcSuccessResponse,
    ctx: NexusRpcContext
  ) => void;
  rpcResponseError: (response: RpcErrorResponse, ctx: NexusRpcContext) => void;
}> {}
