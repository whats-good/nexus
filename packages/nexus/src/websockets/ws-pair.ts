import * as uuid from "uuid";
import type { Logger } from "pino";
import type { WebSocket } from "ws";
import type { NodeEndpoint } from "@src/node-endpoint";
import type { StaticContainer } from "@src/dependency-injection";

/**
 * Represents a pair of websockets, one for the client and one for the node.
 */
export class WebSocketPair {
  public readonly client: WebSocket;
  public readonly node: WebSocket;
  public readonly endpoint: NodeEndpoint;
  public readonly id = uuid.v4();
  public readonly logger: Logger;

  constructor(params: {
    client: WebSocket;
    node: WebSocket;
    endpoint: NodeEndpoint;
    getLogger: StaticContainer["getLogger"];
  }) {
    this.client = params.client;
    this.node = params.node;
    this.endpoint = params.endpoint;
    this.logger = params.getLogger(WebSocketPair.name, {
      clientId: this.id,
    });
  }

  public sendJSONToClient(data: unknown) {
    // TODO: look into fast-json-stringify for performant serialization
    this.client.send(JSON.stringify(data));
  }
}
