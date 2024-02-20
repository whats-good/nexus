import { NexusEvent } from "./nexus-event";
import { Container } from "@src/dependency-injection";

export type NexusEventHandler<
  E extends NexusEvent,
  TServerContext = unknown,
> = (event: E, container: Container<TServerContext>) => Promise<void>;
