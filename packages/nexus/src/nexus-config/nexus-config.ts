import { type Logger } from "pino";
import type { Chain } from "@src/chain";
import type { NexusMiddleware } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";

export class NexusConfig<TPlatformContext = unknown> {
  public readonly nodeProviders: [NodeProvider, ...NodeProvider[]];
  public readonly chains: Map<number, Chain>;
  public readonly relay: RelayConfig;
  public readonly port: number;
  public readonly middleware: NexusMiddleware<TPlatformContext>[];
  public readonly logger: Logger;
  public readonly authKey?: string;

  constructor(params: {
    nodeProviders: [NodeProvider, ...NodeProvider[]];
    chains: Map<number, Chain>;
    relay: RelayConfig;
    port: number;
    middleware: NexusMiddleware<TPlatformContext>[];
    logger: Logger;
    authKey?: string;
  }) {
    this.nodeProviders = params.nodeProviders;
    this.chains = params.chains;
    this.relay = params.relay;
    this.port = params.port;
    this.middleware = params.middleware;
    this.logger = params.logger;
    this.authKey = params.authKey;
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
      middleware: this.middleware.map((m) => m.name),
      auth: this.authKey ? "Enabled" : "Disabled",
    };
  }
}
