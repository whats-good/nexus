import { EventEmitter } from "eventemitter3";
import { WebSocket } from "ws";
import type { Logger } from "pino";
import type { NodeEndpoint, NodeEndpointPool } from "@src/node-endpoint";
import type { StaticContainer } from "@src/dependency-injection";

interface WebSocketPoolEvents {
  connect: (socket: WebSocket, endpoint: NodeEndpoint) => void;
  error: (error: Error) => void;
}

export class WebSocketPool extends EventEmitter<WebSocketPoolEvents> {
  private readonly timeout: number;
  private timer: NodeJS.Timeout | null;
  private readonly logger: Logger;

  constructor(
    private readonly nodeEndpointPool: NodeEndpointPool,
    container: StaticContainer
  ) {
    super();
    this.timer = null;
    this.timeout = 3000; // TODO: make this configurable
    this.logger = container.logger.child({ name: this.constructor.name });
  }

  private connectToWebSocket(nodeEndpoint: NodeEndpoint) {
    this.logger.info(
      "Attempting to connect to <%s>",
      nodeEndpoint.nodeProvider.name
    );
    const ws = new WebSocket(nodeEndpoint.url); // TODO: where do we handle keep-alive?

    const handleTimeout = () => {
      ws.close();
      // TODO: should we destroy the socket here?
      this.logger.warn(
        "Connection timeout to <%s>",
        nodeEndpoint.nodeProvider.name
      );
      this.emit("error", new Error("Connection timeout"));
      this.tryNext();
    };

    const handleOpen = () => {
      if (this.timer) clearTimeout(this.timer);
      removeListeners();
      this.logger.info("Connected to <%s>", nodeEndpoint.nodeProvider.name);

      this.emit("connect", ws, nodeEndpoint);
    };

    const handleError = (err: Error) => {
      if (this.timer) clearTimeout(this.timer);
      removeListeners();
      this.logger.warn(
        "Error connecting to <%s>: %s",
        nodeEndpoint.nodeProvider.name,
        err.message
      );

      if (ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }

      this.emit("error", err);
      this.tryNext();
    };

    const handleClose = () => {
      if (this.timer) clearTimeout(this.timer);
      removeListeners();
      this.logger.warn(
        "Connection closed to <%s>",
        nodeEndpoint.nodeProvider.name
      );
      this.tryNext();
    };

    function removeListeners() {
      ws.off("open", handleOpen);
      ws.off("error", handleError);
      ws.off("close", handleClose);
    }

    this.timer = setTimeout(handleTimeout, this.timeout);

    ws.on("open", handleOpen);
    ws.on("error", handleError);
  }

  private tryNext() {
    const generator = this.nodeEndpointPool.generator();
    const { value: endpoint, done } = generator.next();

    if (!done) {
      this.logger.debug("Trying the next ws endpoint");
      this.connectToWebSocket(endpoint);
    } else {
      this.emit(
        "error",
        new Error("Failed to establish any WebSocket connection")
      );
    }
  }

  public connect() {
    this.tryNext();
  }
}
