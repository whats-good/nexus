import type { Logger } from "../logger";
import type { Chain } from "./chain";

export class ChainRegistry {
  private readonly logger: Logger;
  private readonly chains = new Map<number, Chain>();

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  public addChain(chain: Chain) {
    this.chains.set(chain.chainId, chain);

    if (this.chains.has(chain.chainId)) {
      this.logger.warn(
        `Chain with id ${chain.chainId} already exists. Overwriting.`
      );
    }

    this.logger.info(`Added chain ${chain.name} with id ${chain.chainId}`);
  }
}
