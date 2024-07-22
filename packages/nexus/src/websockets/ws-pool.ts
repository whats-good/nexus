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
  private readonly generator: Generator<NodeEndpoint, void>;

  constructor(
    private readonly nodeEndpointPool: NodeEndpointPool,
    container: StaticContainer
  ) {
    super();
    this.timeout = 3000; // TODO: make this configurable
    this.logger = container.logger.child({ name: this.constructor.name });
    this.generator = this.nodeEndpointPool.generator();
    this.timer = null;

    this.tryNext();
  }

  private cleanup(ws: WebSocket) {
    if (this.timer) clearTimeout(this.timer);
    ws.removeAllListeners("open");
    ws.removeAllListeners("error");
    ws.removeAllListeners("close");
  }

  private connectToWebSocket(nodeEndpoint: NodeEndpoint) {
    const ws = new WebSocket(nodeEndpoint.url);

    this.timer = setTimeout(() => {
      this.cleanup(ws);

      this.logger.warn(
        {
          nodeProvider: nodeEndpoint.nodeProvider.name,
        },
        "Connection timeout"
      );

      if (ws.readyState === WebSocket.CONNECTING) {
        ws.once("open", () => {
          this.logger.warn(
            {
              nodeProvider: nodeEndpoint.nodeProvider.name,
            },
            "Terminating connection that opened after timeout"
          );
          ws.terminate();
        });
      } else if (ws.readyState !== WebSocket.CLOSED) {
        this.logger.warn(
          {
            nodeProvider: nodeEndpoint.nodeProvider.name,
          },
          "Forcing connection to close after timeout"
        );
        ws.terminate();
      }

      this.tryNext();
    }, this.timeout);

    ws.once("open", () => {
      this.logger.info(
        {
          nodeProvider: nodeEndpoint.nodeProvider.name,
        },
        "Connected"
      );
      this.cleanup(ws);
      this.emit("connect", ws, nodeEndpoint);
    });

    ws.once("close", () => {
      this.logger.warn(
        {
          nodeProvider: nodeEndpoint.nodeProvider.name,
        },
        "Connection closed"
      );
      this.cleanup(ws);
      this.tryNext();
    });

    ws.once("error", () => {
      this.logger.warn(
        {
          nodeProvider: nodeEndpoint.nodeProvider.name,
        },
        "Connection error"
      );
      this.cleanup(ws);
      this.tryNext();
    });
  }

  private tryNext() {
    const { value: endpoint, done } = this.generator.next();

    if (!done) {
      this.logger.debug("Trying the next WebSocket endpoint");
      this.connectToWebSocket(endpoint);
    } else {
      this.emit(
        "error",
        new Error("Failed to establish any WebSocket connection")
      );
    }
  }
}
