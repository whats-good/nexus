import { pino, type Logger } from "pino";
import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";

export class StaticContainer<TPlatformContext = unknown> {
  public readonly config: NexusConfig<TPlatformContext>;
  public readonly nextTick: typeof process.nextTick;
  public readonly logger: Logger;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory<TPlatformContext>;

  constructor(params: { config: NexusConfig<TPlatformContext> }) {
    this.config = params.config;
    this.nextTick = this.config.nextTick;
    this.logger = pino({
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          colorizeObjects: true,
        },
      },
      level: this.config.log.level,
    });
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
  }
}
