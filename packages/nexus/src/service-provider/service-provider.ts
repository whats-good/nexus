import type { ChainSupport } from "./chain-support";

export class ServiceProvider {
  constructor(public readonly name: string) {}

  private readonly supportedChains: ChainSupport[] = [];

  public addChainSupport(support: ChainSupport) {
    this.supportedChains.push(support);
  }
}
