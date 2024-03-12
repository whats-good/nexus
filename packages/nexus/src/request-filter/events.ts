import { NexusEvent } from "@src/events";

export class RequestFilterDeniedEvent extends NexusEvent {}

export class RequestFilterFailureEvent extends NexusEvent {
  constructor(public readonly error: unknown) {
    super();
  }
}

export class RequestFilterAllowedEvent extends NexusEvent {}
