import type { ServiceProvider } from "./service-provider";

export class ServiceProviderRegistry {
  private readonly chainIdToProviders = new Map<number, ServiceProvider[]>();

  public addProvider(provider: ServiceProvider) {
    for (const chainSupport of provider.supportedChains.values()) {
      const { chain } = chainSupport;
      const chainProviders = this.chainIdToProviders.get(chain.chainId) ?? [];

      if (!this.chainIdToProviders.has(chain.chainId)) {
        this.chainIdToProviders.set(chain.chainId, chainProviders);
      }

      chainProviders.push(provider);
    }
  }
}
