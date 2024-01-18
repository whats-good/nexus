import type { Chain } from "../chain";
import type { ChainSupport } from "./chain-support";
import type { ServiceProvider } from "./service-provider";

type ServiceProviderWithGuaranteedChainSupport = ServiceProvider & {
  buildChainSupport: (chain: Chain, key?: string) => ChainSupport;
};

export class ServiceProviderRegistry {
  private readonly chainIdToProviders = new Map<number, ServiceProvider[]>();

  public addServiceProvider(provider: ServiceProvider) {
    const supportedChains = provider.getSupportedChains();

    for (const chain of supportedChains) {
      const providers = this.chainIdToProviders.get(chain.chainId) ?? [];

      if (providers.includes(provider)) {
        throw new Error(
          `Provider ${provider.name} is already registered for chain ${chain.name} (${chain.chainId})`
        );
      }

      providers.push(provider);

      this.chainIdToProviders.set(chain.chainId, providers);
    }
  }

  public getProvidersForChain(
    chainId: number
  ): ServiceProviderWithGuaranteedChainSupport[] {
    const providers = this.chainIdToProviders.get(chainId);

    if (!providers) {
      return [];
    }

    // we use this hack, even though a random service provider is not guaranteed to actually
    // support an arbitrary chain, we know that by this point, this provider fully supports
    // this chain, since it's coming from the chain support map. this hack helps us avoid
    // having to do a type check on the return value of `buildChainSupport` in the caller
    // of this function.

    return providers as ServiceProviderWithGuaranteedChainSupport[];
  }
}
