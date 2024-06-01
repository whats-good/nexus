import type { Chain } from "@src/chain";
import { RpcEndpoint } from "@src/rpc-endpoint";
import type { ChainSupport } from "./chain-support";

export class NodeProvider {
  private readonly endpoints: Map<Chain, RpcEndpoint>;
  constructor(public readonly name: string) {
    this.endpoints = new Map();
  }

  public addChainSupport(chainSupport: ChainSupport) {
    // TODO: check if endpoint already exists
    const endpoint = new RpcEndpoint(
      this,
      chainSupport.chain,
      chainSupport.url
    );

    this.endpoints.set(endpoint.chain, endpoint);
  }

  public getSupportedChains(): Chain[] {
    return Array.from(this.endpoints.keys());
  }

  public getEndpointForChain(chain: Chain): RpcEndpoint | null {
    return this.endpoints.get(chain) || null;
  }
}
