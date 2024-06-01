import { NexusEvent } from "@src/events";

export class CacheReadDeniedEvent extends NexusEvent {}

export class CacheReadMissEvent extends NexusEvent {
  constructor(
    public readonly kind: "not-found" | "unexpected-error" | "invalid"
  ) {
    super();
  }
}

export class CacheReadHitEvent extends NexusEvent {
  constructor(public readonly kind: "success" | "legal-error") {
    super();
  }
}

export class CacheWriteSuccessEvent extends NexusEvent {}

export class CacheWriteDeniedEvent extends NexusEvent {}

export class CacheWriteFailureEvent extends NexusEvent {
  constructor(
    public readonly kind:
      | "unexpected-error"
      | "not-configured"
      | "invalid-result"
  ) {
    super();
  }
}
