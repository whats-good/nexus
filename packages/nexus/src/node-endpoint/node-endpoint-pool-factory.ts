import type { Chain } from "@src/chain";
import type { NodeProvider } from "@src/node-provider";
import type { StaticContainer } from "@src/dependency-injection/static-container";
import { NodeEndpointPool } from "./node-endpoint-pool";
import type { RelayConfig } from "./relay-config";

export class NodeEndpointPoolFactory {
  private readonly nodeProviders: NodeProvider[];
  private readonly relayConfig: RelayConfig;
  private readonly chainIdToEndpointPoolMap: Map<number, NodeEndpointPool>;

  constructor(container: StaticContainer) {
    this.nodeProviders = container.config.nodeProviders;
    this.relayConfig = container.config.relay;
    this.chainIdToEndpointPoolMap = this.getChainToEndpointPoolMap();
  }

  public getEndpointPoolForChain(chain: Chain): NodeEndpointPool | null {
    const endpointPool = this.chainIdToEndpointPoolMap.get(chain.chainId);

    if (!endpointPool) {
      return null;
    }

    return endpointPool;
  }

  private getChainToProvidersMap(): Map<Chain, NodeProvider[]> {
    const chainToProvidersMap = new Map<Chain, NodeProvider[]>();

    for (const nodeProvider of this.nodeProviders) {
      const nodeProvidersForChain: NodeProvider[] =
        chainToProvidersMap.get(nodeProvider.chain) || [];

      if (nodeProvidersForChain.length === 0) {
        chainToProvidersMap.set(nodeProvider.chain, nodeProvidersForChain);
      }

      nodeProvidersForChain.push(nodeProvider);
    }

    return chainToProvidersMap;
  }

  private getChainToEndpointPoolMap(): Map<number, NodeEndpointPool> {
    const chainToProvidersMap = this.getChainToProvidersMap();
    const chainToEndpointPoolMap = new Map<number, NodeEndpointPool>();

    for (const [chain, nodeProviders] of chainToProvidersMap.entries()) {
      chainToEndpointPoolMap.set(
        chain.chainId,
        new NodeEndpointPool({
          chain,
          nodeEndpoints: nodeProviders.map(
            (nodeProvider) => nodeProvider.nodeEndpoint
          ),
          config: this.relayConfig,
        })
      );
    }

    return chainToEndpointPoolMap;
  }
}
