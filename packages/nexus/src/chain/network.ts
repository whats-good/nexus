import type { Registry } from "@src/registry";
import type { Chain } from "./chain";

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
