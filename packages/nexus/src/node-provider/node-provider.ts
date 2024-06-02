import type { Chain } from "@src/chain";
import { NodeEndpoint } from "@src/node-endpoint/node-endpoint";

export class NodeProvider {
  public readonly name: string;
  public readonly url: string;
  public readonly chain: Chain;
  public readonly nodeEndpoint: NodeEndpoint;

  constructor(params: { name: string; url: string; chain: Chain }) {
    this.name = params.name;
    this.url = params.url;
    this.chain = params.chain;
    this.nodeEndpoint = new NodeEndpoint({ nodeProvider: this });
  }
}
