import * as uuid from "uuid";
import type { Logger } from "pino";
import type { WebSocket } from "ws";
import type { NodeEndpoint } from "@src/node-endpoint";
import type { LoggerFactory } from "@src/logging";

/**
 * Represents a pair of websockets, one for the client and one for the node.
 */
export class WebSocketContext {
  public readonly client: WebSocket;
  public readonly node: WebSocket;
  public readonly endpoint: NodeEndpoint;
  public readonly id = uuid.v4();
  public readonly logger: Logger;

  constructor(params: {
    client: WebSocket;
    node: WebSocket;
    endpoint: NodeEndpoint;
    loggerFactory: LoggerFactory;
  }) {
    this.client = params.client;
    this.node = params.node;
    this.endpoint = params.endpoint;
    this.logger = params.loggerFactory.get(WebSocketContext.name, {
      clientId: this.id,
    });
  }

  public sendJSONToClient(data: unknown) {
    // TODO: look into fast-json-stringify for performant serialization
    this.client.send(JSON.stringify(data));
  }
}
