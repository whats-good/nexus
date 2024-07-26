import "reflect-metadata"; // TODO: document this, and later remove it. make the user responsible for importing it, since they may already have it imported

import type { Server as NodeHttpServer } from "node:http";
import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import type { Logger } from "pino";
import { container } from "tsyringe";
import {
  NexusConfig,
  NexusConfigFactory,
  type NexusConfigOptions,
} from "@src/nexus-config";
import { HttpController } from "@src/http";
import { WsPairHandler, WsRpcServer } from "@src/websockets";
import { StaticContainer } from "@src/dependency-injection";
import { LoggerFactory } from "@src/logging";

export type NexusServerInstance = ServerAdapter<unknown, Nexus>;

export class Nexus implements ServerAdapterBaseObject<unknown> {
  private readonly controller: HttpController;
  private readonly wsPairHandler: WsPairHandler;
  public readonly port?: number;
  public readonly logger: Logger;
  public readonly on: StaticContainer["eventBus"]["on"];

  private constructor(staticContainer: StaticContainer) {
    this.controller = container.resolve(HttpController);
    this.wsPairHandler = container.resolve(WsPairHandler);
    const loggerFactory = container.resolve(LoggerFactory); // TODO: nexus class should be injected with all these, instead of using container.resolve like this

    this.logger = loggerFactory.get(Nexus.name);
    this.on = staticContainer.eventBus.on.bind(staticContainer.eventBus);
    this.port = staticContainer.config.port;
  }

  public handle = async (request: Request): Promise<Response> => {
    // TODO: wrap this with a try-catch for final error handling
    return (await this.controller.handleRequest(request)).buildResponse();
  };

  public ws(httpServer: NodeHttpServer) {
    const wsServer = container.resolve(WsRpcServer);

    wsServer.on("connection", (pair) => {
      this.wsPairHandler.handleConnection(pair);
    });

    httpServer.on("upgrade", wsServer.handleUpgrade.bind(wsServer));
  }

  public static create(options?: NexusConfigOptions) {
    const nexusConfigFactory = new NexusConfigFactory(options);
    const config = nexusConfigFactory.getNexusConfig();

    container.register(NexusConfig, { useValue: config });

    const server = new Nexus(container.resolve(StaticContainer));

    server.logger.info("Nexus server created");

    return createServerAdapter<unknown, Nexus>(
      server
    ) as unknown as NexusServerInstance;
  }
}
