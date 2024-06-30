import { type Logger } from "pino";
import type { Chain } from "@src/chain";
import type { AnyEventHandlerOf } from "@src/events";
import type { NexusMiddleware } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";

export class NexusConfig<TPlatformContext = unknown> {
  public readonly nodeProviders: [NodeProvider, ...NodeProvider[]];
  public readonly chains: Map<number, Chain>;
  public readonly relay: RelayConfig;
  public readonly port: number;
  public readonly eventHandlers: AnyEventHandlerOf<TPlatformContext>[];
  public readonly middleware: NexusMiddleware<TPlatformContext>[];
  public readonly nextTick: typeof process.nextTick;
  public readonly logger: Logger;

  constructor(params: {
    nodeProviders: [NodeProvider, ...NodeProvider[]];
    chains: Map<number, Chain>;
    relay: RelayConfig;
    port: number;
    eventHandlers: AnyEventHandlerOf<TPlatformContext>[];
    middleware: NexusMiddleware<TPlatformContext>[];
    nextTick: typeof process.nextTick;
    logger: Logger;
  }) {
    this.nodeProviders = params.nodeProviders;
    this.chains = params.chains;
    this.relay = params.relay;
    this.port = params.port;
    this.eventHandlers = params.eventHandlers;
    this.middleware = params.middleware;
    this.nextTick = params.nextTick;
    this.logger = params.logger;
  }

  // a summary object that removes potentially sensitive information
  public summary() {
    return {
      nodeProviders: this.nodeProviders.map(
        (nodeProvider) => nodeProvider.name
      ),
      chains: Array.from(this.chains.values()),
      relay: this.relay,
      port: this.port,
      logLevel: this.logger.level,
      eventHandlers: `Found ${this.eventHandlers.length} event handler(s)`,
      middleware: `Found ${this.middleware.length} middleware`,
    };
  }
}
