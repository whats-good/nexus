import type { Registry } from "@src/registry";
import type { Config } from "@src/config";
import type { Network } from "./network";

export interface ChainStatus {
  chainId: number;
  chainName: string;
  networkName: string;
  isEnabled: boolean;
  // TODO: add isDeprecated
  // isDeprecated: boolean;
}

export class Chain {
  private constructor(
    public readonly chainId: number,
    public readonly network: Network,
    public readonly name: string
  ) {}

  public getStatus(config: Config): ChainStatus {
    return {
      chainName: this.name,
      chainId: this.chainId,
      networkName: this.network.name,
      isEnabled: !!config.chains[this.chainId]?.enabled,
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
