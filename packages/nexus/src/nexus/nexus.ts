import type http from "node:http";
import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import type { Logger } from "pino";
import { NexusConfigFactory, type NexusConfigOptions } from "@src/nexus-config";
import { Controller } from "@src/controller";
import { StaticContainer } from "@src/dependency-injection";
import { safeErrorStringify } from "@src/utils";
import { NexusWebSocketController } from "@src/websockets";

export type NexusServerInstance<TPlatformContext = unknown> = ServerAdapter<
  TPlatformContext,
  Nexus<TPlatformContext>
>;

export class Nexus<TPlatformContext = unknown>
  implements ServerAdapterBaseObject<TPlatformContext>
{
  public readonly container: StaticContainer<TPlatformContext>;
  private readonly controller: Controller<TPlatformContext>;
  private readonly webSocketController: NexusWebSocketController<TPlatformContext>;
  public readonly port?: number;
  public readonly logger: Logger;

  private constructor(container: StaticContainer<TPlatformContext>) {
    this.container = container;
    this.controller = new Controller(container);
    this.webSocketController = new NexusWebSocketController(container);
    this.port = container.config.port;
    this.logger = container.logger.child({ name: this.constructor.name });
  }

  public handle = async (
    request: Request,
    ctx: TPlatformContext
  ): Promise<Response> => {
    // TODO: wrap this with a try-catch for final error handling
    // TODO: find a way to generalize the sockets via platform context.
    return (await this.controller.handleRequest(request, ctx)).buildResponse();
  };

  // TODO: this is platform specific. need to make it work for all platforms, such as cloudflare workers
  public ws(nodeServer: http.Server) {
    nodeServer.on("upgrade", (req, socket, head) => {
      this.webSocketController
        .handleUpgrade(req, socket, head)
        .catch((error) => {
          // TODO: add proper error handling
          this.logger.error(safeErrorStringify(error));
          socket.destroy();
        });
    });
  }

  public static create<TPlatformContext = unknown>(
    options?: NexusConfigOptions<TPlatformContext>
  ) {
    const nexusConfigFactory = new NexusConfigFactory(options);
    const config = nexusConfigFactory.getNexusConfig(options || {});

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
