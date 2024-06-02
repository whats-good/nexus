// import { Controller } from "@src/controller";
import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";

export class StaticContainer {
  public readonly config: NexusConfig;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory;
  // public readonly controller: Controller;

  constructor(params: { config: NexusConfig }) {
    this.config = params.config;
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
    // this.controller = new Controller(this);
  }
}
