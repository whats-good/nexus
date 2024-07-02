import WebSocket from "ws";
import type { Logger } from "pino";
import { safeErrorStringify } from "@src/utils";

interface WebSocketTarget {
  url: string;
}

interface ConnectedWebSocketTarget<T extends WebSocketTarget> {
  ws: WebSocket;
  target: T;
}

export class WebSocketPool<T extends WebSocketTarget> {
  constructor(
    private readonly targets: T[],
    private readonly timeout: number,
    private readonly logger: Logger
  ) {}

  public async getConnection(): Promise<ConnectedWebSocketTarget<T>> {
    for (const target of this.targets) {
      try {
        const connection = await this.tryConnect(target);

        // TODO: hide secret information
        this.logger.info(`Connected to ${target.url}`);

        return connection;
      } catch (error) {
        this.logger.warn(
          // TODO: hide secret information
          `Failed to connect to ${target.url}: ${safeErrorStringify(error)}`
        );
      }
    }

    throw new Error("All connections failed");
  }

  private tryConnect(target: T): Promise<ConnectedWebSocketTarget<T>> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(target.url);

      const timeoutId = setTimeout(() => {
        ws.terminate();
        reject(new Error("Connection timed out"));
      }, this.timeout);

      ws.on("open", () => {
        clearTimeout(timeoutId);
        ws.removeAllListeners("open");
        ws.removeAllListeners("error");
        resolve({
          ws,
          target,
        });
      });

      ws.on("error", (err) => {
        clearTimeout(timeoutId);
        ws.terminate();
        reject(err);
      });
    });
  }
}
