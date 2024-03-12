import type { Container } from "@src/dependency-injection";
import type { NexusEvent } from "./nexus-event";

export type NexusEventHandler<
  E extends NexusEvent,
  TServerContext = unknown,
> = (event: E, container: Container<TServerContext>) => Promise<void>;
