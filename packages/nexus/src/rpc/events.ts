import { NexusEvent } from "@src/events";
import { NexusContext } from "./nexus-context";
import { RpcSuccessResponse } from "./rpc-response";
import { ErrorResponsePayload } from "./schemas";

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
