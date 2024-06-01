import { NexusEvent } from "@src/events";

export class CannedResponseHitEvent extends NexusEvent {}
export class CannedResponseMissEvent extends NexusEvent {
  constructor(
    public readonly kind: "not-configured" | "unexpected-error" | "cancelled"
  ) {
    super();
  }
}
