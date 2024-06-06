import { NexusEvent } from "@src/events";
import type { RpcResponseSuccessPayloadType } from "@src/rpc-schema";

export class RpcResponseSuccessEvent extends NexusEvent {
  constructor(public readonly payload: RpcResponseSuccessPayloadType) {
    super();
  }
}
