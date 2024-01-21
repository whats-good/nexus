import type { Chain } from "../chain";
import type { ServiceProviderEndpoint } from "./service-provider-endpoint";
import type { ServiceProvider } from "./service-provider";

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

  public getRpcEndpointsForChain(
    chain: Chain,
    providerKeys: Record<string, string | undefined>
  ): ServiceProviderEndpoint[] {
    const providers = this.chainIdToProviders.get(chain.chainId);

    if (!providers) {
      return [];
    }

    const rpcEndpoints = providers
      .map((provider) => {
        const key = providerKeys[provider.name];

        return provider.buildRpcEndpoint(chain, key);
      })
      .filter((rpcEndpoint): rpcEndpoint is ServiceProviderEndpoint => {
        return !!rpcEndpoint;
      });

    return rpcEndpoints;
  }
}
