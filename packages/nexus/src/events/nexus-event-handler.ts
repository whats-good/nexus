import { NexusContext } from "@src/rpc";
import { NexusEvent } from "./nexus-event";

export type NexusEventHandler<
  E extends NexusEvent,
  TServerContext = unknown,
> = (event: E, context: NexusContext<TServerContext>) => Promise<void>;
