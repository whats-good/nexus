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
  isProduction: boolean;
};

export class ServiceProvider {
  public readonly name: string;
  public readonly supportedChains: Partial<Record<number, ChainSupport>>;
  public readonly envSecretKeyName?: string;

  constructor(params: {
    name: string;
    supportedChains: Partial<Record<number, ChainSupport>>;
    envSecretKeyName?: string;
  }) {
    this.name = params.name;
    this.supportedChains = params.supportedChains;
    this.envSecretKeyName = params.envSecretKeyName;
  }

  public isConfiguredForChain(chain: Chain, config: Config): boolean {
    return !!this.getRpcEndpoint(chain, config);
  }

  public getRpcEndpoint(chain: Chain, config: Config): RpcEndpoint | undefined {
    const chainSupport = this.supportedChains[chain.chainId];

    if (!chainSupport) {
      return undefined;
    }

    if (!config.providers[this.name]?.enabled) {
      console.warn(`Service provider: ${this.name} is not enabled`);

      return undefined;
    }

    if (chainSupport.type === "url-append-key") {
      const directKey = config.providers[this.name]?.key;
      const envKey = this.envSecretKeyName
        ? config.env[this.envSecretKeyName]
        : undefined;
      const key = directKey || envKey;

      if (!key) {
        console.warn(`Key for service provider: ${this.name} not found`);

        return undefined;
      }

      return new RpcEndpoint({
        url: `${chainSupport.baseURL}/${key}`,
        chain,
        provider: this,
      });
    }

    return new RpcEndpoint({
      url: chainSupport.url,
      chain,
      provider: this,
    });
  }
}
