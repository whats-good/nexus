import { toUpperSnakeCase } from "@src/utils";
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

  constructor(params: {
    name: string;
    supportedChains: Partial<Record<number, ChainSupport>>;
  }) {
    this.name = params.name;
    this.supportedChains = params.supportedChains;
  }

  public isConfiguredForChain(chain: Chain, config: Config): boolean {
    return !!this.getRpcEndpoint(chain, config);
  }

  private getEnvSecretKeyName(): string {
    // TODO: update env vars and documentation to reflect this change
    return `NEXUS_PROVIDER_${toUpperSnakeCase(this.name)}_KEY`;
  }

  private isEnabled(config: Config): boolean {
    const providerConfig = config.providers[this.name];

    if (typeof providerConfig === "undefined") {
      return true;
    }

    return !providerConfig.disabled;
  }

  private getKey(config: Config): string | undefined {
    const directKey = config.providers[this.name]?.key;
    const envKey = config.env[this.getEnvSecretKeyName()];

    return directKey || envKey;
  }

  public getRpcEndpoint(chain: Chain, config: Config): RpcEndpoint | undefined {
    const chainSupport = this.supportedChains[chain.chainId];

    if (!chainSupport) {
      return undefined;
    }

    if (!this.isEnabled(config)) {
      console.warn(`Service provider: ${this.name} is not enabled`);

      return undefined;
    }

    if (chainSupport.type === "url-append-key") {
      const key = this.getKey(config);

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
