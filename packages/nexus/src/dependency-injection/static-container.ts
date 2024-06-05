import { pino, type Logger } from "pino";
import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";

export class StaticContainer<TPlatformContext = unknown> {
  public readonly config: NexusConfig<TPlatformContext>;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory;
  public readonly logger: Logger;

  constructor(params: { config: NexusConfig<TPlatformContext> }) {
    this.config = params.config;
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
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
  }
}
