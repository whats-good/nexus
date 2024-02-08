import { RpcSuccessResponse } from "@src/rpc/rpc-response";
import { NexusEvent } from "./nexus-event";

export class RelaySuccessEvent extends NexusEvent {
  constructor(public readonly response: RpcSuccessResponse) {
    super();
  }
}
