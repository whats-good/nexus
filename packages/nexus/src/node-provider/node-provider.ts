import type { Chain } from "@src/chain";

const DEFAULT_NODE_PROVIDER_WEIGHT = 1;

export class NodeProvider {
  public readonly name: string;
  public readonly url: string;
  public readonly chain: Chain;
  public readonly weight: number;

  constructor(params: {
    name: string;
    url: string;
    chain: Chain;
    weight?: number;
  }) {
    if (!params.url) {
      throw new Error("NodeProvider url is required");
    }

    this.name = params.name;
    this.url = params.url;
    this.chain = params.chain;
    this.weight = params.weight || DEFAULT_NODE_PROVIDER_WEIGHT;
  }
}
