import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";

export class StaticContainer<TPlatformContext = unknown> {
  public readonly config: NexusConfig<TPlatformContext>;
  public readonly nextTick: typeof process.nextTick;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory<TPlatformContext>;

  constructor(params: { config: NexusConfig<TPlatformContext> }) {
    this.config = params.config;
    this.nextTick = this.config.nextTick;
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
  }

  public get logger() {
    return this.config.logger;
  }
}
