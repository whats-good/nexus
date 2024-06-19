import type { Chain } from "@src/chain";

export class NodeProvider {
  public readonly name: string;
  public readonly url: string;
  public readonly chain: Chain;

  constructor(params: { name: string; url: string; chain: Chain }) {
    if (!params.url) {
      throw new Error("NodeProvider url is required");
    }

    this.name = params.name;
    this.url = params.url;
    this.chain = params.chain;
  }
}
