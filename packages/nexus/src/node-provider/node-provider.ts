import type { Chain } from "@src/chain";
import { NodeEndpoint } from "@src/node-endpoint/node-endpoint";

export class NodeProvider {
  public readonly url: string;
  public readonly chain: Chain;
  public readonly nodeEndpoint: NodeEndpoint;

  constructor(params: { url: string; chain: Chain }) {
    this.url = params.url;
    this.chain = params.chain;
    this.nodeEndpoint = new NodeEndpoint({ nodeProvider: this });
  }
}
