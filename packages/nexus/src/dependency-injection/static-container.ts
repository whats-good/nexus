import type { Logger } from "pino";
import { WsPairHandler } from "@src/websockets";
import { AuthorizationService } from "@src/auth";
import type { NexusConfig } from "@src/nexus-config";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";
import { EventBus } from "@src/events";

export class StaticContainer {
  public readonly config: NexusConfig;
  public readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory;
  public readonly authorizationService: AuthorizationService;
  public readonly eventBus = new EventBus();
  public readonly wsPairHandler: WsPairHandler;

  constructor(params: { config: NexusConfig }) {
    this.config = params.config;
    this.nodeEndpointPoolFactory = new NodeEndpointPoolFactory(this);
    this.authorizationService = new AuthorizationService(this.config.authKey);
    this.wsPairHandler = new WsPairHandler(this);
  }

  public getLogger(name: string, options: Record<string, any> = {}): Logger {
    // TODO: redact node provider url, and start logging providers directly
    // TODO: find out what the x in 'name/x`is as they appear in the logs
    return this.config.logger.child({ name, ...options });
  }
}
