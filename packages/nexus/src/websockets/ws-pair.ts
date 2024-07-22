import * as uuid from "uuid";
import type { Logger } from "pino";
import type { WebSocket } from "ws";
import type { NodeEndpoint } from "@src/node-endpoint";
import type { StaticContainer } from "@src/dependency-injection";

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
    container: StaticContainer
  ) {
    this.logger = container.logger.child({ name: `ws-pair-${this.id}` });
  }

  public sendJSONToClient(data: unknown) {
    // TODO: look into fast-json-stringify for performant serialization
    this.client.send(JSON.stringify(data));
  }
}
