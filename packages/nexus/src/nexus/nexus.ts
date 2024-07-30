import type { Server as NodeHttpServer } from "node:http";
import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import type { Logger } from "pino";
import { decorate, injectable } from "inversify";
import { EventEmitter } from "eventemitter3";
import {
  NexusConfig,
  NexusConfigFactory,
  type NexusConfigOptions,
} from "@src/nexus-config";
import { HttpController } from "@src/http";
import { WsContextHandler, WsRpcServer } from "@src/websockets";
import { LoggerFactory } from "@src/logging";
import { EventBus } from "@src/events";
import { container } from "@src/dependency-injection";

decorate(injectable(), EventEmitter); // TODO: put this somewhere else

export type NexusServerInstance = ServerAdapter<unknown, Nexus>;

@injectable()
export class Nexus implements ServerAdapterBaseObject<unknown> {
  public readonly port?: number;
  public readonly logger: Logger;
  public readonly on: EventBus["on"];

  constructor(
    private readonly controller: HttpController,
    private readonly wsContextHandler: WsContextHandler,
    loggerFactory: LoggerFactory,
    eventBus: EventBus,
    config: NexusConfig
  ) {
    this.logger = loggerFactory.get(Nexus.name);
    this.on = eventBus.on.bind(eventBus);
    this.port = config.port;
  }

  public handle = async (request: Request): Promise<Response> => {
    // TODO: wrap this with a try-catch for final error handling
    return (await this.controller.handleRequest(request)).buildResponse();
  };

  public ws(httpServer: NodeHttpServer) {
    const wsServer = container.resolve(WsRpcServer);

    wsServer.on("connection", (context) => {
      this.wsContextHandler.handleConnection(context);
    });

    httpServer.on("upgrade", wsServer.handleUpgrade.bind(wsServer));
  }

  public static create(options?: NexusConfigOptions) {
    const nexusConfigFactory = new NexusConfigFactory(options);
    const config = nexusConfigFactory.getNexusConfig();

    container.bind(NexusConfig).toConstantValue(config);

    const nexus = container.resolve(Nexus);

    nexus.logger.info("Nexus server created");

    return createServerAdapter<unknown, Nexus>(
      nexus
    ) as unknown as NexusServerInstance;
  }
}
