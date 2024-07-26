import { injectable } from "tsyringe";
import { NexusConfig } from "@src/nexus-config";
import { EventBus } from "@src/events";

// TODO: remove this entire class
@injectable()
export class StaticContainer {
  public readonly eventBus = new EventBus();

  constructor(public readonly config: NexusConfig) {}
}
