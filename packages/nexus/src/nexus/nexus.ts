import type { Server as NodeHttpServer } from "node:http";
import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import type { Logger } from "pino";
import { NexusConfigFactory, type NexusConfigOptions } from "@src/nexus-config";
import { Controller } from "@src/controller";
import { StaticContainer } from "@src/dependency-injection";
import { WsRpcServer } from "@src/websockets";
import { WsContextHandler } from "@src/websockets/ws-context-handler";

export type NexusServerInstance<TPlatformContext = unknown> = ServerAdapter<
  TPlatformContext,
  Nexus<TPlatformContext>
>;

export class Nexus<TPlatformContext = unknown>
  implements ServerAdapterBaseObject<TPlatformContext>
{
  private readonly container: StaticContainer<TPlatformContext>;
  private readonly controller: Controller<TPlatformContext>;
  private readonly wsContextHandler: WsContextHandler<TPlatformContext>;
  public readonly port?: number;
  public readonly logger: Logger;

  private constructor(container: StaticContainer<TPlatformContext>) {
    this.container = container;
    this.controller = new Controller(container);
    this.port = container.config.port;
    this.logger = container.logger.child({ name: this.constructor.name });
    this.wsContextHandler = new WsContextHandler(container);
  }

  public handle = async (
    request: Request,
    ctx: TPlatformContext
  ): Promise<Response> => {
    // TODO: wrap this with a try-catch for final error handling
    return (await this.controller.handleRequest(request, ctx)).buildResponse();
  };

  public ws(httpServer: NodeHttpServer) {
    const wsServer = new WsRpcServer(this.container);

    wsServer.on("connection", (context) => {
      this.wsContextHandler.handleConnection(context);
    });

    httpServer.on("upgrade", wsServer.handleUpgrade.bind(wsServer));
  }

  public static create<TPlatformContext = unknown>(
    options?: NexusConfigOptions<TPlatformContext>
  ) {
    const nexusConfigFactory = new NexusConfigFactory(options);
    const config = nexusConfigFactory.getNexusConfig();

    const staticContainer = new StaticContainer({
      config,
    });

    staticContainer.logger.info(
      "Nexus created with the following config: %o",
      config.summary()
    );
    const server = new Nexus(staticContainer);

    return createServerAdapter<TPlatformContext, Nexus<TPlatformContext>>(
      server
    ) as unknown as NexusServerInstance<TPlatformContext>;
  }
}
