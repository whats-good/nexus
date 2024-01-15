import type { ChainSupport } from "./chain-support";

export class ServiceProvider {
  constructor(public readonly name: string) {}

  public readonly supportedChains = new Map<number, ChainSupport>();

  public addChainSupport(support: ChainSupport) {
    this.supportedChains.set(support.chain.chainId, support);
  }
}
