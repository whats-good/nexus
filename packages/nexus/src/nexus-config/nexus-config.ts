import type { Chain } from "@src/chain";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";

export interface NexusConfigOptions {
  nodeProviders: [NodeProvider, ...NodeProvider[]];
  relay: RelayConfig;
  port: number;
}

export class NexusConfig {
  public readonly nodeProviders: NodeProvider[];
  public readonly chains: Map<number, Chain>;
  public readonly relay: RelayConfig;
  public readonly port: number;

  private constructor(params: {
    nodeProviders: [NodeProvider, ...NodeProvider[]];
    chains: Map<number, Chain>;
    relay: RelayConfig;
    port: number;
  }) {
    this.nodeProviders = params.nodeProviders;
    this.chains = params.chains;
    this.relay = params.relay;
    this.port = params.port;
  }

  public static init(params: NexusConfigOptions) {
    const uniqueChains = Array.from(
      new Set(params.nodeProviders.map((nodeProvider) => nodeProvider.chain))
    );

    return new NexusConfig({
      nodeProviders: params.nodeProviders,
      chains: new Map(uniqueChains.map((chain) => [chain.chainId, chain])),
      relay: params.relay,
      port: params.port,
    });
  }
}
