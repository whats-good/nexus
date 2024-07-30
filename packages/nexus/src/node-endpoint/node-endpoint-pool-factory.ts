import { injectable } from "inversify";
import type { Chain } from "@src/chain";
import type { NodeProvider } from "@src/node-provider";
import { LoggerFactory } from "@src/logging";
import { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPool } from "./node-endpoint-pool";
import { NodeEndpoint } from "./node-endpoint";

type Protocol = "http" | "ws";

@injectable()
export class NodeEndpointPoolFactory {
  private readonly nodeProviders: NodeProvider[];
  public readonly http: Map<Chain, NodeEndpointPool>;
  public readonly ws: Map<Chain, NodeEndpointPool>;

  constructor(
    private readonly config: NexusConfig,
    private readonly loggerFactory: LoggerFactory // TODO: this should not be a property.
  ) {
    this.nodeProviders = config.nodeProviders;
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
          config: this.config, // TODO: make this ioc friendly
          chain,
          nodeEndpoints: nodeProviders.map(
            (nodeProvider) =>
              new NodeEndpoint({
                nodeProvider,
              })
          ),
          loggerFactory: this.loggerFactory,
        })
      );
    }

    return chainToEndpointPoolMap;
  }
}
