import type { Chain } from "@src/chain";
import type { AnyEventHandler } from "@src/events";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";

export interface LogConfig {
  level: string;
}

export interface NexusConfigOptions<TPlatformContext = unknown> {
  nodeProviders: [NodeProvider, ...NodeProvider[]];
  relay: RelayConfig;
  port?: number;
  log?: LogConfig;
  eventHandlers?: AnyEventHandler[];
}

export class NexusConfig<TPlatformContext = unknown> {
  public readonly nodeProviders: NodeProvider[];
  public readonly chains: Map<number, Chain>;
  public readonly relay: RelayConfig;
  public readonly log: LogConfig;
  public readonly port?: number;
  public readonly eventHandlers: AnyEventHandler[];

  private constructor(params: {
    nodeProviders: [NodeProvider, ...NodeProvider[]];
    chains: Map<number, Chain>;
    relay: RelayConfig;
    log: LogConfig;
    port?: number;
    eventHandlers: AnyEventHandler[];
  }) {
    this.nodeProviders = params.nodeProviders;
    this.chains = params.chains;
    this.relay = params.relay;
    this.port = params.port;
    this.log = params.log;
    this.eventHandlers = params.eventHandlers;
  }

  public static init<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>
  ) {
    const uniqueChains = Array.from(
      new Set(params.nodeProviders.map((nodeProvider) => nodeProvider.chain))
    );

    return new NexusConfig<TPlatformContext>({
      nodeProviders: params.nodeProviders,
      chains: new Map(uniqueChains.map((chain) => [chain.chainId, chain])),
      relay: params.relay,
      port: params.port,
      log: params.log || { level: "info" },
      eventHandlers: params.eventHandlers || [],
    });
  }
}
