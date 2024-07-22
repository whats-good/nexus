import * as uuid from "uuid";
import type { Logger } from "pino";
import type { WebSocket } from "ws";
import type { NodeEndpoint } from "@src/node-endpoint";

/**
 * Represents a pair of websockets, one for the client and one for the node.
 */
export class WebSocketPair {
  public readonly id = uuid.v4();
  public readonly logger: Logger;

  constructor(
    public readonly client: WebSocket,
    public readonly node: WebSocket,
    public readonly endpoint: NodeEndpoint,
    logger: Logger // TODO: why does the socket pair need a logger?
  ) {
    this.logger = logger.child({
      name: this.constructor.name,
      clientId: this.id,
    });
  }

  public sendJSONToClient(data: unknown) {
    // TODO: look into fast-json-stringify for performant serialization
    this.client.send(JSON.stringify(data));
  }
}
