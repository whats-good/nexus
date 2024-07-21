import { AuthorizationService } from "@src/auth";
import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";

export class StaticContainer<TPlatformContext = unknown> {
  public readonly config: NexusConfig<TPlatformContext>;
  public readonly nextTick: typeof process.nextTick;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory<TPlatformContext>;
  public readonly authorizationService: AuthorizationService;

  constructor(params: { config: NexusConfig<TPlatformContext> }) {
    this.config = params.config;
    this.nextTick = this.config.nextTick;
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
    this.authorizationService = new AuthorizationService(this.config.authKey);
  }

  public get logger() {
    return this.config.logger;
  }
}
