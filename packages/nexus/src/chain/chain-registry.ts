import type { Logger } from "@src/logger";
import type { Chain } from "./chain";

export class ChainRegistry {
  private readonly logger: Logger;
  public readonly chains = new Map<number, Chain>();

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  public addChain(chain: Chain) {
    if (this.chains.has(chain.chainId)) {
      this.logger.warn(
        `Chain with id ${chain.chainId} already exists. Overwriting.`
      );
    }
    this.chains.set(chain.chainId, chain);
    this.logger.debug(`Added chain ${chain.name} with id ${chain.chainId}`);
  }

  public addChains(chains: Chain[]) {
    chains.forEach((chain) => this.addChain(chain));
  }

  public getChain(chainId: number): Chain | null {
    return this.chains.get(chainId) ?? null;
  }
}
