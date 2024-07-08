import type * as stream from "node:stream";
import type * as http from "node:http";
import { createProxyServer } from "http-proxy";
import type { Logger } from "pino";
import { chainIdRoute } from "@src/routes";
import { safeErrorStringify } from "@src/utils";
import type {
  NodeEndpointPool,
  NodeEndpointPoolFactory,
} from "@src/node-endpoint";
import type { NexusConfig } from "@src/nexus-config";
import type { StaticContainer } from "@src/dependency-injection";

export class NexusWebSocketController<TPlatformContext = unknown> {
  private readonly config: NexusConfig<TPlatformContext>;
  private readonly logger: Logger;
  private readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory<TPlatformContext>;

  constructor(container: StaticContainer<TPlatformContext>) {
    this.config = container.config;
    this.logger = container.logger.child({ name: this.constructor.name });
    this.nodeEndpointPoolFactory = container.nodeEndpointPoolFactory;
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
    const params = chainIdRoute.match(url.pathname);

    if (!params) {
      this.logger.error("No chain ID found in request");
      socket.destroy();

      return;
    }

    const chain = this.config.chains.get(params.chainId);

    if (!chain) {
      this.logger.error("Chain not found");
      socket.destroy();

      return;
    }

    this.logger.info("Handling upgrade request for chain %s", chain.name);

    const nodeEndpointPool = this.nodeEndpointPoolFactory.ws.get(chain);

    if (!nodeEndpointPool) {
      this.logger.error("No node connection found");
      socket.destroy();

      return;
    }

    this.logger.info("Found connection pool for chain %s", chain.name);

    return this.handleUpgradeWithPool(req, socket, head, nodeEndpointPool);
  }
}
