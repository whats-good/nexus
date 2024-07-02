import type { Logger } from "pino";
import type WebSocket from "ws";
import { safeErrorStringify } from "@src/utils";

export class WebSocketProxy {
  constructor(
    private readonly client: WebSocket,
    private readonly server: WebSocket,
    private readonly logger: Logger
  ) {}

  public start() {
    const client = this.client;
    const server = this.server;

    server.on("message", (message: WebSocket.Data) => {
      client.send(message);
      // TODO: handle error
      // TODO: handle readyState
    });

    client.on("message", (message: WebSocket.Data) => {
      server.send(message);
      // TODO: handle error
      // TODO: handle readyState
    });

    server.on("close", () => {
      client.close(); // TODO: handle client.terminate()
    });

    client.on("close", () => {
      server.close(); // TODO: handle server.terminate()
    });

    server.on("ping", (data) => {
      // TODO: handle readyState
      client.ping(data);
    });

    server.on("pong", (data) => {
      // TODO: handle readyState
      client.pong(data);
    });

    client.on("ping", (data) => {
      // TODO: handle readyState
      server.ping(data);
    });

    client.on("pong", (data) => {
      // TODO: handle readyState
      server.pong(data);
    });

    server.on("error", (err) => {
      this.logger.warn(`Error from server: ${safeErrorStringify(err)}`); // TODO: make log levels configurable
      client.close(); // TODO: handle client.terminate()
    });

    client.on("error", (err) => {
      this.logger.warn(`Error from client: ${safeErrorStringify(err)}`); // TODO: make log levels configurable
      server.close(); // TODO: handle server.terminate()
    });
  }
}
