import type { Registry } from "@src/registry";

export class Network {
  private readonly chains = new Map<string, Chain>();

  private constructor(public readonly name: string) {}

  public addChain(chain: Chain) {
    if (this.chains.has(chain.name)) {
      throw new Error(`Chain ${chain.name} already exists`);
    }

    this.chains.set(chain.name, chain);
  }

  public getChain(name: string): Chain | undefined {
    return this.chains.get(name);
  }

  public static init(
    registry: Registry,
    name: string,
    aliases?: string[]
  ): Network {
    const existingNetwork = registry.getNetwork(name);
    const network = existingNetwork || new Network(name);

    registry.registerNetwork(network, aliases);

    return network;
  }
}

export interface ChainStatus {
  chainId: number;
  chainName: string;
  networkName: string;
  // TODO: add isDeprecated
  // isDeprecated: boolean;
}

export class Chain {
  private constructor(
    public readonly chainId: number,
    public readonly network: Network,
    public readonly name: string
  ) {}

  public get status(): ChainStatus {
    return {
      chainName: this.name,
      chainId: this.chainId,
      networkName: this.network.name,
      // isDeprecated: this.isDeprecated,
    };
  }

  public static init(
    registry: Registry,
    params: {
      chainId: number;
      network: Network;
      name: string;
    }
  ): Chain {
    const chain = new Chain(params.chainId, params.network, params.name);

    params.network.addChain(chain);
    registry.registerChain(chain);

    return chain;
  }
}
