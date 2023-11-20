export interface ChainStatus {
  chainId: number;
  chainName: string;
  networkName: string;
  isDeprecated: boolean;
}

export interface Network {
  name: string;
  aliases: string[];
  chains: Partial<Record<string, Chain>>;
}

export class Chain {
  public readonly name: string;
  public readonly chainId: number;
  public readonly network: Network;
  public readonly isDeprecated: boolean;

  constructor(params: {
    name: string;
    chainId: number;
    network: Network;
    isDeprecated?: boolean;
  }) {
    const { name, chainId, network, isDeprecated } = params;

    this.name = name;
    this.chainId = chainId;
    this.network = network;
    this.isDeprecated = isDeprecated || false;
  }

  public get status(): ChainStatus {
    return {
      chainName: this.name,
      chainId: this.chainId,
      networkName: this.network.name,
      isDeprecated: this.isDeprecated,
    };
  }
}
