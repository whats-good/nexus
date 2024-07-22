import type { Server as NodeHttpServer } from "node:http";
import type { ServerAdapterBaseObject } from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import type { Logger } from "pino";
import { NexusConfigFactory, type NexusConfigOptions } from "@src/nexus-config";
import { Controller } from "@src/controller";
import { StaticContainer } from "@src/dependency-injection";
import { WsRpcServer } from "@src/websockets";
import { WsContextHandler } from "@src/websockets/ws-context-handler";

export class Nexus implements ServerAdapterBaseObject<unknown> {
  private readonly container: StaticContainer;
  private readonly controller: Controller;
  private readonly wsContextHandler: WsContextHandler;
  public readonly port?: number;
  public readonly logger: Logger;
  public readonly on: StaticContainer["eventBus"]["on"];

  private constructor(container: StaticContainer) {
    this.container = container;
    this.controller = new Controller(container);
    this.port = container.config.port;
    this.logger = container.logger.child({ name: this.constructor.name });
    this.wsContextHandler = new WsContextHandler(container);
    this.on = container.eventBus.on.bind(container.eventBus);
  }

  public handle = async (request: Request): Promise<Response> => {
    // TODO: wrap this with a try-catch for final error handling
    return (await this.controller.handleRequest(request)).buildResponse();
  };

  public ws(httpServer: NodeHttpServer) {
    const wsServer = new WsRpcServer(this.container);

    wsServer.on("connection", (context) => {
      this.wsContextHandler.handleConnection(context);
    });

    httpServer.on("upgrade", wsServer.handleUpgrade.bind(wsServer));
  }

  public static create(options?: NexusConfigOptions) {
    const nexusConfigFactory = new NexusConfigFactory(options);
    const config = nexusConfigFactory.getNexusConfig();

    const staticContainer = new StaticContainer({
      config,
    });

    staticContainer.logger.info(config.summary(), "Nexus created");
    const nexus = new Nexus(staticContainer);

    return createServerAdapter(nexus);
  }
}
