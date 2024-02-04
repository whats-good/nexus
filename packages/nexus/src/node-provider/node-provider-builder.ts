import { Chain } from "@src/chain";
import {
  ChainSupport,
  KeyAppendedUrlChainSupport,
  PureUrlChainSupport,
} from "./chain-support";
import { NodeProvider } from "./node-provider";

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

export type ChainSupportInitArgs =
  | KeyAppendedUrlChainSupportInitArgs
  | PureUrlChainSupportInitArgs;

export class NodeProviderBuilder {
  constructor(public readonly name: string) {}

  private readonly chainSupportInitArgs: ChainSupportInitArgs[] = [];

  public addChainSupport(chainSupport: ChainSupportInitArgs) {
    this.chainSupportInitArgs.push(chainSupport);
    return this;
  }

  private buildChainSupport(
    initArgs: ChainSupportInitArgs,
    key?: string
  ): ChainSupport {
    const { chain } = initArgs;
    switch (initArgs.kind) {
      case "key-appended-url": {
        if (!key) {
          throw new Error(
            `Chain ${chain.name} (${chain.chainId}) requires a key to be specified`
          );
        }

        return new KeyAppendedUrlChainSupport(chain, initArgs.baseURL, key);
      }

      case "pure-url":
        return new PureUrlChainSupport(chain, initArgs.url);
    }
  }

  public build(key?: string): NodeProvider {
    const nodeProvider = new NodeProvider(this.name);
    this.chainSupportInitArgs.forEach((initArgs) => {
      const chainSupport = this.buildChainSupport(initArgs, key);
      nodeProvider.addChainSupport(chainSupport);
    });

    return nodeProvider;
  }
}
