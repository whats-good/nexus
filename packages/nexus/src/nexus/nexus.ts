import type * as stream from "node:stream";
import type * as http from "node:http";
import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import type { Logger } from "pino";
import { createProxyServer } from "http-proxy";
import { NexusConfigFactory, type NexusConfigOptions } from "@src/nexus-config";
import { Controller } from "@src/controller";
import { StaticContainer } from "@src/dependency-injection";
import { chainIdRoute } from "@src/routes";
import { safeErrorStringify } from "@src/utils";
import type { NodeEndpointPool } from "@src/node-endpoint";

export type NexusServerInstance<TPlatformContext = unknown> = ServerAdapter<
  TPlatformContext,
  Nexus<TPlatformContext>
>;

export class Nexus<TPlatformContext = unknown>
  implements ServerAdapterBaseObject<TPlatformContext>
{
  public readonly container: StaticContainer<TPlatformContext>;
  private readonly controller: Controller<TPlatformContext>;
  public readonly port?: number;
  public readonly logger: Logger;

  private constructor(container: StaticContainer<TPlatformContext>) {
    this.container = container;
    this.controller = new Controller(container);
    this.port = container.config.port;
    this.logger = container.logger.child({ name: this.constructor.name });
  }

  private async handleUpgradeWithPool(
    req: http.IncomingMessage,
    socket: stream.Duplex,
    head: Buffer,
    pool: NodeEndpointPool<TPlatformContext>
  ) {
    let hasEndpoint = false;

    for (const endpoint of pool.getNextEndpoint()) {
      this.logger.info(
        "Attempting to connect to %s",
        endpoint.nodeProvider.name
      );

      try {
        const proxy = createProxyServer({
          target: endpoint.url.toString(),
          // target: endpoint.url,
          ws: true,
          changeOrigin: true,
        });

        // TODO: ws connection failures crash the entire server!

        proxy.on("proxyReqWs", (proxyReq, _req, proxySocket) => {
          proxySocket.on("error", (err) => {
            // TODO: if the socket can fail here, then how do we handle it?
            this.logger.error("WS error: %o", err);
            socket.destroy();
          });

          // TODO: handle closed connections
        });

        req.url = "/"; // we modify req.url to avoid sending endpoint or query params

        proxy.ws(req, socket, head);
        hasEndpoint = true;
        break;
      } catch (error) {
        this.logger.error(safeErrorStringify(error));
        socket.destroy();
      }
    }

    if (!hasEndpoint) {
      this.logger.error("Failed to connect to node");
      socket.destroy();
    }
  }

  // TODO: clean up
  // TODO: this is platform specific.
  // TODO: remove all these upgrade handler from nexus server instance,
  // and put them in specific platform adapters.
  public ws(nodeServer: http.Server) {
    nodeServer.on("upgrade", (req, socket, head) => {
      this.handleUpgrade(req, socket, head).catch((error) => {
        // TODO: add proper error handling
        this.logger.error(safeErrorStringify(error));
        socket.destroy();
      });
    });
  }

  // TODO: clean up
  public async handleUpgrade(
    req: http.IncomingMessage,
    socket: stream.Duplex,
    head: Buffer
  ) {
    // TODO: make these requests also pass through the existing middleware like auth etc
    if (!req.url) {
      this.logger.error("No URL found in request");
      socket.destroy();

      return;
    }

    const url = new URL(req.url, "http://localhost");
    const chainIdParams = chainIdRoute.match(url.pathname);

    if (!chainIdParams) {
      this.logger.error("No chain ID found in request");
      socket.destroy();

      return;
    }

    const chain = this.container.config.chains.get(chainIdParams.chainId);

    if (!chain) {
      this.logger.error("Chain not found");
      socket.destroy();

      return;
    }

    this.logger.info("Handling upgrade request for chain %s", chain.name);

    const nodeEndpointPool =
      this.container.nodeEndpointPoolFactory.ws.get(chain);

    if (!nodeEndpointPool) {
      this.logger.error("No node connection found");
      socket.destroy();

      return;
    }

    this.logger.info("Found connection pool for chain %s", chain.name);

    return this.handleUpgradeWithPool(req, socket, head, nodeEndpointPool);
  }

  public handle = async (
    request: Request,
    ctx: TPlatformContext
  ): Promise<Response> => {
    // TODO: wrap this with a try-catch for final error handling
    // TODO: find a way to generalize the sockets via platform context.
    return (await this.controller.handleRequest(request, ctx)).buildResponse();
  };

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
