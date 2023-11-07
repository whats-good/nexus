import type { Network } from "./chain";
import { Chain } from "./chain";

interface ChainDescriptor {
  chainId: number;
  isDeprecated?: boolean;
}

interface NetworkDescriptor {
  aliases?: string[];
  chains: Record<string, ChainDescriptor>;
}

export type NetworkDescriptors = Record<string, NetworkDescriptor>;

type Networks = Partial<Record<string, Network>>;

type Chains = Partial<Record<number, Chain>>;

export class ChainRegistry {
  private readonly networks: Networks;
  private readonly chains: Chains;

  constructor(descriptors: NetworkDescriptors) {
    this.networks = ChainRegistry.getNetworksFromDescriptors(descriptors);
    this.chains = ChainRegistry.getChainsFromNetworks(this.networks);
  }

  public getChainById(chainId: number): Chain | undefined {
    return this.chains[chainId];
  }

  public getChainByNames(
    networkName: string,
    chainName: string
  ): Chain | undefined {
    const network = this.networks[networkName];

    if (!network) {
      return undefined;
    }

    return network.chains[chainName];
  }

  // TODO: test
  public getByOptionalParams(params: {
    chainId?: number;
    networkName?: string;
    chainName?: string;
  }): Chain | undefined {
    const { chainId, networkName, chainName } = params;

    if (chainId) {
      return this.getChainById(chainId);
    }

    if (networkName && chainName) {
      return this.getChainByNames(networkName, chainName);
    }

    return undefined;
  }

  private static getNetworksFromDescriptors(
    descriptors: NetworkDescriptors
  ): Networks {
    const networks: Networks = {};

    for (const [networkName, networkDescriptor] of Object.entries(
      descriptors
    )) {
      const network: Network = {
        name: networkName,
        aliases: networkDescriptor.aliases || [],
        chains: {},
      };

      for (const [chainName, chainDescriptor] of Object.entries(
        networkDescriptor.chains
      )) {
        network.chains[chainName] = new Chain({
          name: chainName,
          chainId: chainDescriptor.chainId,
          network,
          isDeprecated: chainDescriptor.isDeprecated,
        });
      }

      networks[networkName] = network;

      for (const alias of network.aliases) {
        networks[alias] = network;
      }
    }

    return networks;
  }

  private static getChainsFromNetworks(networks: Networks): Chains {
    const chains: Chains = {};

    for (const network of Object.values(networks)) {
      for (const [, chain] of Object.entries(network!.chains)) {
        chains[chain!.chainId] = chain;
      }
    }

    return chains;
  }
}
