import type { Chain } from "../chain";
import type { ChainSupport } from "./chain-support";
import {
  KeyAppendedUrlChainSupport,
  PureUrlChainSupport,
} from "./chain-support";
import { RpcEndpoint } from "./rpc-endpoint";

interface KeyAppendedUrlChainSupportInitArgs {
  kind: "key-appended-url";
  chain: Chain;
  baseURL: string;
}

interface PureUrlChainSupportInitArgs {
  kind: "pure-url";
  chain: Chain;
  url: string;
}

type ChainSupportInitArgs =
  | KeyAppendedUrlChainSupportInitArgs
  | PureUrlChainSupportInitArgs;

export class ServiceProvider {
  constructor(public readonly name: string) {}

  public readonly chainSupportInitArgs = new Map<
    number,
    ChainSupportInitArgs
  >();

  public addChainSupport(chainSupport: ChainSupportInitArgs) {
    this.chainSupportInitArgs.set(chainSupport.chain.chainId, chainSupport);
  }

  public getSupportedChains(): Chain[] {
    const chainSupportInitArgs = Array.from(this.chainSupportInitArgs.values());
    const chains = chainSupportInitArgs.map(
      (chainSupport) => chainSupport.chain
    );

    return chains;
  }

  private buildChainSupport(
    chain: Chain,
    key?: string
  ): ChainSupport | undefined {
    const chainSupport = this.chainSupportInitArgs.get(chain.chainId);

    if (!chainSupport) {
      return undefined;
    }

    switch (chainSupport.kind) {
      case "key-appended-url": {
        if (!key) {
          throw new Error(
            `Chain ${chain.name} (${chain.chainId}) requires a key to be specified`
          );
        }

        return new KeyAppendedUrlChainSupport(chain, chainSupport.baseURL, key);
      }

      case "pure-url":
        return new PureUrlChainSupport(chain, chainSupport.url);
    }
  }

  public buildRpcEndpoint(chain: Chain, key?: string): RpcEndpoint | undefined {
    const chainSupport = this.buildChainSupport(chain, key);

    if (!chainSupport) {
      return undefined;
    }

    return new RpcEndpoint(this, chain, chainSupport.url);
  }
}
