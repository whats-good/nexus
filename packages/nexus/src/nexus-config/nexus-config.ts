import { type Logger } from "pino";
import { injectable } from "inversify";
import type { Chain } from "@src/chain";
import type { NexusMiddleware } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";
import type { SubscriptionSharingConfig } from "@src/subscriptions/subscription-sharing-config";

@injectable()
export class NexusConfig {
  public readonly nodeProviders: [NodeProvider, ...NodeProvider[]];
  public readonly chains: Map<number, Chain>;
  public readonly relay: RelayConfig;
  public readonly port: number;
  public readonly middleware: NexusMiddleware[];
  public readonly logger: Logger;
  public readonly authKey?: string;
  public readonly subscriptionSharing: SubscriptionSharingConfig;

  constructor(params: {
    nodeProviders: [NodeProvider, ...NodeProvider[]];
    chains: Map<number, Chain>;
    relay: RelayConfig;
    port: number;
    middleware: NexusMiddleware[];
    logger: Logger;
    authKey?: string;
    subscriptionSharing: SubscriptionSharingConfig;
  }) {
    this.nodeProviders = params.nodeProviders;
    this.chains = params.chains;
    this.relay = params.relay;
    this.port = params.port;
    this.middleware = params.middleware;
    this.logger = params.logger;
    this.authKey = params.authKey;
    this.subscriptionSharing = params.subscriptionSharing;
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
      subscriptionSharing: this.subscriptionSharing,
    };
  }
}
