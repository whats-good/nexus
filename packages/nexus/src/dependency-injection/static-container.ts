import type { WebSocket } from "ws";
import { AuthorizationService } from "@src/auth";
import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";
import type { WsContext } from "@src/websockets/ws-context";

export class StaticContainer<TPlatformContext = unknown> {
  public readonly config: NexusConfig<TPlatformContext>;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory<TPlatformContext>;
  public readonly authorizationService: AuthorizationService;
  public readonly wsContexts = new Map<
    WebSocket,
    WsContext<TPlatformContext>
  >();

  constructor(params: { config: NexusConfig<TPlatformContext> }) {
    this.config = params.config;
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
    this.authorizationService = new AuthorizationService(this.config.authKey);
  }

  public get logger() {
    return this.config.logger;
  }
}
