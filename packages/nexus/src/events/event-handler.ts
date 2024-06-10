import { type Constructor } from "@src/utils";
import type { NexusRpcContext } from "@src/dependency-injection";
import type { NexusEvent } from "./nexus-event";

export interface EventHandler<
  E extends NexusEvent,
  TPlatformContext = unknown,
> {
  event: Constructor<E>;
  handle: (
    event: E,
    context: NexusRpcContext<TPlatformContext>
  ) => Promise<void>;
}

export type AnyEventHandlerOf<TPlatformContext> = EventHandler<
  any,
  TPlatformContext
>;
