import type { Chain } from "@src/chain";
import type { NodeProvider } from "@src/node-provider";
import type { StaticContainer } from "@src/dependency-injection/static-container";
import { NodeEndpointPool } from "./node-endpoint-pool";
import { NodeEndpoint } from "./node-endpoint";

type Protocol = "http" | "ws";

export class NodeEndpointPoolFactory<TPlatformContext = unknown> {
  private readonly container: StaticContainer<TPlatformContext>;
  private readonly nodeProviders: NodeProvider[];
  public readonly http: Map<Chain, NodeEndpointPool>;
  public readonly ws: Map<Chain, NodeEndpointPool>;

  constructor(container: StaticContainer<TPlatformContext>) {
    this.container = container;
    this.nodeProviders = container.config.nodeProviders;
    this.http = this.createChainToEndpointPoolMap("http");
    this.ws = this.createChainToEndpointPoolMap("ws");
  }

  private createChainToProvidersMap(
    protocol: Protocol
  ): Map<Chain, NodeProvider[]> {
    const chainToProvidersMap = new Map<Chain, NodeProvider[]>();
    const nodeProviders = this.nodeProviders.filter((nodeProvider) =>
      protocol === "http" ? nodeProvider.isHttp() : nodeProvider.isWs()
    );

    for (const nodeProvider of nodeProviders) {
      const nodeProvidersForChain: NodeProvider[] =
        chainToProvidersMap.get(nodeProvider.chain) || [];

      if (nodeProvidersForChain.length === 0) {
        chainToProvidersMap.set(nodeProvider.chain, nodeProvidersForChain);
      }

      nodeProvidersForChain.push(nodeProvider);
    }

    return chainToProvidersMap;
  }

  private createChainToEndpointPoolMap(
    protocol: Protocol
  ): Map<Chain, NodeEndpointPool> {
    const chainToProvidersMap = this.createChainToProvidersMap(protocol);
    const chainToEndpointPoolMap = new Map<Chain, NodeEndpointPool>();

    for (const [chain, nodeProviders] of chainToProvidersMap.entries()) {
      chainToEndpointPoolMap.set(
        chain,
        new NodeEndpointPool({
          container: this.container,
          chain,
          nodeEndpoints: nodeProviders.map(
            (nodeProvider) =>
              new NodeEndpoint({
                nodeProvider,
              })
          ),
        })
      );
    }

    return chainToEndpointPoolMap;
  }
}
