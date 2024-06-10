import { NexusEvent } from "@src/events";
import type { RpcErrorResponse, RpcSuccessResponse } from "@src/rpc-response";

export class RpcResponseSuccessEvent extends NexusEvent {
  constructor(public readonly payload: RpcSuccessResponse) {
    super();
  }
}

export class RpcResponseErrorEvent extends NexusEvent {
  constructor(public readonly payload: RpcErrorResponse) {
    super();
  }
}
