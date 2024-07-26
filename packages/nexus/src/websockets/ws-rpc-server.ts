import { type IncomingMessage } from "node:http";
import { type Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { EventEmitter } from "eventemitter3";
import type { Logger } from "pino";
import { injectable } from "inversify";
import { chainIdRoute } from "@src/routes";
import { errSerialize } from "@src/utils";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";
import { AuthorizationService } from "@src/auth";
import { NexusConfig } from "@src/nexus-config";
import { LoggerFactory } from "@src/logging";
import { WebSocketPool } from "./ws-pool";
import { WebSocketPair } from "./ws-pair";
import { WsPairHandler } from "./ws-pair-handler";

// TODO: add a way to route requests to special destinations, for example "alchemy_minedTransactions" should to go to alchemy

// TODO: do we actually need to extend EventEmitter here?

@injectable()
export class WsRpcServer extends EventEmitter<{
  connection: (pair: WebSocketPair) => void;
}> {
  private readonly wss: WebSocketServer;
  private readonly logger: Logger;

  constructor(
    private readonly config: NexusConfig,
    private readonly loggingFactory: LoggerFactory,
    private readonly wsPairHandler: WsPairHandler,
    private readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory,
    private readonly authorizationService: AuthorizationService
  ) {
    super();

    this.logger = this.loggingFactory.get(WsRpcServer.name);

    this.wss = new WebSocketServer({
      noServer: true,
    });

    this.wss.on("connection", (ws, request) => {
      const pair = this.wsPairHandler.getWsPair(ws);

      this.logger.debug("New websocket connection established");

      if (!pair) {
        this.logger.error(
          "Received a connection, but no socket pair was found for it"
        );
        ws.terminate();
        request.destroy();

        return;
      }

      this.emit("connection", pair);
    });
  }

  public handleUpgrade = (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) => {
    // TODO: use these options to configure the socket.
    // socket.setTimeout(0);
    // socket.setNoDelay(true);
    // socket.setKeepAlive(true, 0);
    // TODO: do these for both the socket and the proxy socket
    // TODO: use stream.on('readable') instead of socket.on('data'). this
    // allows us to "pull" the data instead of being pushed.
    // TODO: make use of stream.pipeline, and think about {end:false} as a a way to keep the socket open.

    const url = new URL(req.url || "", "http://localhost"); // TODO: is localhost the right default?

    if (!this.authorizationService.isAuthorized(url)) {
      this.logger.warn("Received an unauthorized websocket upgrade request");
      socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n"); // TODO: double check that this is the correct response

      return;
    }

    const path = url.pathname;
    const route = chainIdRoute.match(path);

    if (!route) {
      this.logger.warn("Received an invalid websocket upgrade request");
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); // TODO: double check that this is the correct response
      // TODO: see if we can communicate the error to the client

      return;
    }

    const { chainId } = route;
    const chain = this.config.chains.get(chainId);

    if (!chain) {
      this.logger.warn(
        {
          chainId,
        },
        `Received a websocket upgrade request for an unknown chain`
      );
      // TODO: this is probably incorrect. derive the protocol from the request
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); // TODO: double check that this is the correct response

      // TODO: see if we can communicate the error to the client
      return;
    }

    const endpointPool = this.nodeEndpointPoolFactory.ws.get(chain);

    if (!endpointPool) {
      this.logger.warn(
        {
          chain,
        },
        `Received a websocket upgrade request for a chain without a websocket endpoint`
      );
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); // TODO: double check that this is the correct response

      // TODO: see if we can communicate the error to the client
      return;
    }

    // TODO: use dependency injection to create a request scoped wsPool
    const wsPool = new WebSocketPool(endpointPool, this.loggingFactory);

    wsPool.once("connect", (nodeSocket, endpoint) => {
      this.wss.handleUpgrade(req, socket, head, (clientSocket) => {
        this.logger.debug("Upgrading to websocket connection");
        // TODO: use dependency injection to create a request scoped wsPair
        const pair = new WebSocketPair({
          client: clientSocket,
          node: nodeSocket,
          endpoint,
          loggerFactory: this.loggingFactory,
        });

        this.wsPairHandler.registerWsPair(pair);

        this.wss.emit("connection", clientSocket, req);
      });
    });

    wsPool.once("error", (error) => {
      this.logger.error(
        errSerialize(error),
        `Could not connect to any ws provider`
      );

      socket.end("HTTP/1.1 500 Internal Server Error\r\n\r\n"); // TODO: double check that this is correct
    });
  };
}
