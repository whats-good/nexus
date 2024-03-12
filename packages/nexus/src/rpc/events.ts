import { NexusEvent } from "@src/events";
import type { NexusContext } from "./nexus-context";
import type { RpcSuccessResponse } from "./rpc-response";
import type { ErrorResponsePayload } from "./schemas";

export class RelaySuccessResponseEvent extends NexusEvent {
  constructor(
    public readonly response: RpcSuccessResponse,
    public readonly context: NexusContext<any>
  ) {
    super();
  }
}

export class RelayLegalErrorResponeEvent extends NexusEvent {
  constructor(public readonly error: ErrorResponsePayload) {
    super();
  }
}

export class RelayUnexpectedErrorEvent extends NexusEvent {
  constructor(public readonly error: unknown) {
    super();
  }
}
