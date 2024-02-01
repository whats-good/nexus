import type { Chain } from "@src/chain";
import type { RpcEndpoint } from "@src/rpc-endpoint";
import type { ServiceProvider } from "./service-provider";
import { Logger } from "@src/logger";

export class ServiceProviderRegistry {
  private readonly logger: Logger;

  public constructor(args: { logger: Logger }) {
    this.logger = args.logger;
  }

  private readonly chainIdToProviders = new Map<number, ServiceProvider[]>();

  public addServiceProvider(provider: ServiceProvider) {
    const supportedChains = provider.getSupportedChains();

    for (const chain of supportedChains) {
      const providers = this.chainIdToProviders.get(chain.chainId) ?? [];

      if (providers.includes(provider)) {
        this.logger.warn(
          `Provider ${provider.name} is already registered for chain ${chain.name} (${chain.chainId}). Skipping.`
        );
      } else {
        providers.push(provider);
      }

      this.chainIdToProviders.set(chain.chainId, providers);
    }
  }

  public addServiceProviders(providers: ServiceProvider[]) {
    providers.forEach((provider) => this.addServiceProvider(provider));
  }

  public getEndpointsForChain(chain: Chain): RpcEndpoint[] {
    const providers = this.chainIdToProviders.get(chain.chainId);

    if (!providers) {
      return [];
    }

    const rpcEndpoints = providers
      .map((provider) => {
        return provider.getEndpointForChain(chain);
      })
      .filter((rpcEndpoint): rpcEndpoint is RpcEndpoint => {
        return !!rpcEndpoint;
      });

    return rpcEndpoints;
  }
}
