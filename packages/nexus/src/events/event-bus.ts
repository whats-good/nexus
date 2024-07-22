import { EventEmitter } from "eventemitter3";
import type { NexusRpcContext } from "@src/dependency-injection";
import type { RpcErrorResponse, RpcSuccessResponse } from "@src/rpc-response";

export class EventBus extends EventEmitter<{
  rpcResponseSuccess: (
    response: RpcSuccessResponse,
    ctx: NexusRpcContext
  ) => void;
  rpcResponseError: (response: RpcErrorResponse, ctx: NexusRpcContext) => void;
}> {}
