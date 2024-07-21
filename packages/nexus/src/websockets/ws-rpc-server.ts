import { type IncomingMessage } from "node:http";
import { type Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";
import { EventEmitter } from "eventemitter3";
import type { Logger } from "pino";
import * as uuid from "uuid";
import { safeErrorStringify, safeJsonStringify } from "@src/utils";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
import type { StaticContainer } from "@src/dependency-injection";
import { chainIdRoute } from "@src/routes";
import type { NodeEndpoint } from "@src/node-endpoint";
import { WebSocketPool } from "./ws-pool";

// TODO: add a way to route requests to special destinations, for example "alchemy_minedTransactions" should to go to alchemy

function incomingDataToJSON(data: RawData) {
  try {
    const result: unknown = JSON.parse(data as unknown as string); // TODO: add tests and more validation here. still not sure if RawData can be treated as a string under all circumstances

    return {
      kind: "success" as const,
      result,
    };
  } catch (e) {
    return {
      kind: "error" as const,
      error: e,
    };
  }
}

class WsContext {
  public readonly id = uuid.v4();
  public readonly logger: Logger;

  constructor(
    public readonly client: WebSocket, // TODO: do we assign an id here?
    public readonly node: WebSocket,
    public readonly endpoint: NodeEndpoint,
    private readonly container: StaticContainer
  ) {
    this.logger = container.logger.child({ name: `ws-context-${this.id}` });
  }

  public sendJSONToClient(data: unknown) {
    // TODO: look into fast-json-stringify for performant serialization
    this.client.send(JSON.stringify(data));
  }
}

// TODO: do we actually need to extend EventEmitter here?
export class WsRpcServer extends EventEmitter<{
  listening: () => void;
}> {
  private readonly wss: WebSocketServer;
  private readonly logger: Logger;
  private wsContexts = new Map<WebSocket, WsContext>();

  constructor(private container: StaticContainer) {
    super();

    this.logger = container.logger.child({ name: this.constructor.name });

    this.wss = new WebSocketServer({
      noServer: true, // TODO: make this configurable
    });

    this.logger.info("Created a new WebSocket RPC server"); // TODO: remove

    this.wss.on("listening", () => this.emit("listening"));

    // TODO: do we need to emit other events here?

    this.wss.on("connection", this.handleConnection.bind(this));
  }

  private handleClientSocketCleanup(clientSocket: WebSocket) {
    if (clientSocket.readyState !== WebSocket.CLOSED) {
      clientSocket.close(); // TODO: do we destroy instead?
    }

    const context = this.wsContexts.get(clientSocket);

    if (!context) {
      this.logger.warn(
        "Attempted to cleanup the client socket, but no context was found"
      );

      return;
    }

    const { node } = context;

    if (node.readyState !== WebSocket.CLOSED) {
      node.close(); // TODO: do we destroy instead?
      this.logger.debug("Node socket closed");
      // TODO: look into http-proxy to see how they handle cleanup
    }

    this.wsContexts.delete(clientSocket);
    // TODO: handle subscription accounting and close shared subscriptions if needed
  }

  public handleUpgrade = (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) => {
    // TODO: handle authentication here
    // TODO: use these options to configure the socket.
    // socket.setTimeout(0);
    // socket.setNoDelay(true);
    // socket.setKeepAlive(true, 0);
    // TODO: do these for both the socket and the proxy socket
    // TODO: use stream.on('readable') instead of socket.on('data'). this
    // allows us to "pull" the data instead of being pushed.
    // TODO: don't use pipe. matteo colina says error handling is super complex here.
    // TODO: make use of stream.pipeline, and think about {end:false} as a a way to keep the socket open.

    const url = new URL(req.url || "", "http://localhost"); // TODO: is localhost the right default?
    const path = url.pathname;
    const route = chainIdRoute.match(path);

    if (!route) {
      this.logger.warn("Received an invalid websocket upgrade request");
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); // TODO: double check that this is the correct response
      // TODO: see if we can communicate the error to the client

      return;
    }

    const { chainId } = route;
    const chain = this.container.config.chains.get(chainId);

    if (!chain) {
      this.logger.warn(
        `Received a websocket upgrade request for an unknown chain: ${chainId}`
      );
      // TODO: this is probably incorrect. derive the protocol from the request
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); // TODO: double check that this is the correct response

      // TODO: see if we can communicate the error to the client
      return;
    }

    const endpointPool = this.container.nodeEndpointPoolFactory.ws.get(chain);

    if (!endpointPool) {
      this.logger.warn(
        `Received a websocket upgrade request for a chain without a websocket endpoint: ${chainId}`
      );
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); // TODO: double check that this is the correct response

      // TODO: see if we can communicate the error to the client
      return;
    }

    const wsPool = new WebSocketPool(endpointPool, this.container);

    wsPool.connect();

    wsPool.on("connect", (nodeSocket, endpoint) => {
      this.wss.handleUpgrade(req, socket, head, (clientSocket) => {
        this.logger.debug("Upgrading to websocket connection");
        const context = new WsContext(
          clientSocket,
          nodeSocket,
          endpoint,
          this.container
        );

        this.wsContexts.set(clientSocket, context);

        this.wss.emit("connection", clientSocket, req);
      });
    });

    wsPool.on("error", (error) => {
      this.logger.error(
        `Could not connect to any ws provider: ${safeErrorStringify(error)}`
      );
    });
  };

  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    const context = this.wsContexts.get(ws);

    this.logger.debug("New websocket connection established");

    if (!context) {
      this.logger.error(
        "Received a connection, but no context was found for it"
      );
      ws.terminate(); // TODO: should we close or terminate?
      request.destroy(); // TODO: should we destroy the request?

      return;
    }

    const { client, node, endpoint } = context;

    // TODO: node-level errors and close events should trigger client cleanup, and vice versa

    node.on("message", (data) => {
      if (client.readyState !== WebSocket.OPEN) {
        context.logger.error(
          `Received a message from <${endpoint.nodeProvider.name}>, even though the client socket was closed.`
        );

        return;
      }

      // TODO: handle interception, caching, event handling and so on
      context.logger.debug(
        `Received a message from the ws node: <${endpoint.nodeProvider.name}>. Relaying to the client...`
      );

      client.send(data);
    });

    // propagate socket errors
    client.on("error", (error) => {
      context.logger.error(error);
      // this.emit("client-socket-error", client, error); // TODO: is "socket-error" the right event name?
      // TODO: should we create a timeout to close the socket?
      // TODO: do we cleanup the socket here?
      // TODO: we should clean up the node socket too
    });

    // cleanup after the socket gets disconnected
    client.on("close", () => {
      // TODO: handle unsubscribing, and closing the proxy socket
      context.logger.debug("Client socket closed, cleaning up...");
      this.handleClientSocketCleanup(client);
      // this.emit("client-socket-close", client); // TODO: is "client-socket-close" the right event name?
    });

    client.on("message", (data) => {
      context.logger.debug("Received new websocket message");

      if (client.readyState !== WebSocket.OPEN) {
        context.logger.warn("Received a message on a closed socket");

        // TODO: what does this mean? do we need to close the socket here?
        return;
      }

      const jsonParsed = incomingDataToJSON(data);

      if (jsonParsed.kind === "error") {
        context.logger.warn(safeErrorStringify(jsonParsed.error));
        context.sendJSONToClient({
          // TODO: standardize these error responses
          id: null,
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
          },
        });
      }

      const rpcRequestPayloadParsed = RpcRequestPayloadSchema.safeParse(
        jsonParsed.result
      );

      if (!rpcRequestPayloadParsed.success) {
        context.logger.warn(
          `Received an invalid RPC payload: ${rpcRequestPayloadParsed.error.message}`
        );
        context.sendJSONToClient({
          id: null,
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
          },
        });

        return;
      }

      const rpcRequestPayload = rpcRequestPayloadParsed.data;

      context.logger.debug(
        `Received a valid RPC ws request: ${safeJsonStringify(
          rpcRequestPayload
        )}` // TODO: we don't need to keep converting to string. this is already done at the top, when we parse the incoming data
      );

      // TODO: if there are no websocket endpoints available, we should
      // still try to carry the request to http endpoints. this will cover
      // a large portion of ws requests anyway.

      context.logger.debug("Relaying the RPC request to the ws node");
      context.node.send(data);

      // TODO: how do we treat multi json rpc messages?
    });

    // TODO: should we emit a special event with the ws context?

    // this.emit("connection", clientSocket, request); // TODO: do we even need this?
  }
}
