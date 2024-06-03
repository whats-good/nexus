// import { Controller } from "@src/controller";
import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";

export class StaticContainer<TServerContext = unknown> {
  public readonly config: NexusConfig<TServerContext>;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory;
  // public readonly controller: Controller;

  constructor(params: { config: NexusConfig<TServerContext> }) {
    this.config = params.config;
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
    // this.controller = new Controller(this);
  }
}
