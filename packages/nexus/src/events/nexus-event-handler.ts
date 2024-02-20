import { NexusEvent } from "./nexus-event";
import { NexusConfig } from "@src/config";

export type NexusEventHandler<
  E extends NexusEvent,
  TServerContext = unknown,
> = (event: E, config: NexusConfig<TServerContext>) => Promise<void>;
