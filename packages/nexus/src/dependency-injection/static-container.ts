import type { WebSocket } from "ws";
import type { WebSocketPair } from "@src/websockets";
import { AuthorizationService } from "@src/auth";
import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";
import { EventBus } from "@src/events";

export class StaticContainer {
  public readonly config: NexusConfig;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory;
  public readonly authorizationService: AuthorizationService;
  public readonly wsPairs = new Map<WebSocket, WebSocketPair>();
  public readonly eventBus = new EventBus();

  constructor(params: { config: NexusConfig }) {
    this.config = params.config;
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
    this.authorizationService = new AuthorizationService(this.config.authKey);
  }

  public get logger() {
    return this.config.logger;
  }
}
