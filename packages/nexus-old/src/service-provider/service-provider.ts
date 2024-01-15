import type { Registry } from "@src/registry";
import type { Config } from "../config";
import { RpcEndpoint } from "../rpc-endpoint/rpc-endpoint";
import type { Chain } from "../chain/chain";

interface UrlAppendKeyEndpointConstructor {
  type: "url-append-key";
  baseURL: string;
}

interface PureUrlChainEndpointConstructor {
  type: "url";
  url: string;
}

export type EndpointConstructor =
  | UrlAppendKeyEndpointConstructor
  | PureUrlChainEndpointConstructor;

export type ChainSupport = EndpointConstructor & {
  // TODO: add isProduction
  // isProduction: boolean;
};

export class ServiceProvider {
  private readonly supportedChains = new Map<number, ChainSupport>();
  private constructor(public readonly name: string) {}

  public static init(registry: Registry, name: string): ServiceProvider {
    const existingServiceProvider = registry.getServiceProvider(name);
    const serviceProvider =
      existingServiceProvider || new ServiceProvider(name);

    registry.registerServiceProvider(serviceProvider);

    return serviceProvider;
  }

  public addChainSupport(chainId: number, support: ChainSupport) {
    this.supportedChains.set(chainId, support);
  }

  public isConfiguredForChain(chain: Chain, config: Config): boolean {
    return !!this.getRpcEndpoint(chain, config);
  }

  private isEnabled(config: Config): boolean {
    return !!config.providers[this.name]?.enabled;
  }

  public getRpcEndpoint(chain: Chain, config: Config): RpcEndpoint | undefined {
    const chainSupport = this.supportedChains.get(chain.chainId);

    if (!chainSupport) {
      return undefined;
    }

    if (!this.isEnabled(config)) {
      config.logger.warn(`Service provider: ${this.name} is not enabled`);

      return undefined;
    }

    if (chainSupport.type === "url-append-key") {
      const key = config.providers[this.name]?.key;

      if (!key || key.length === 0) {
        config.logger.warn(`Key for service provider: ${this.name} not found`);

        return undefined;
      }

      return new RpcEndpoint({
        url: `${chainSupport.baseURL}/${key}`,
        chain,
        provider: this,
        logger: config.logger,
      });
    }

    return new RpcEndpoint({
      url: chainSupport.url,
      chain,
      provider: this,
      logger: config.logger,
    });
  }
}
