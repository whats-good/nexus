import * as uuid from "uuid";
import type { Logger } from "pino";
import type { WebSocket } from "ws";
import type { NodeEndpoint } from "@src/node-endpoint";
import type { StaticContainer } from "@src/dependency-injection";

export class WsContext<TPlatformContext = unknown> {
  public readonly id = uuid.v4();
  public readonly logger: Logger;

  constructor(
    public readonly client: WebSocket,
    public readonly node: WebSocket,
    public readonly endpoint: NodeEndpoint,
    private readonly container: StaticContainer<TPlatformContext>
  ) {
    this.logger = container.logger.child({ name: `ws-context-${this.id}` });
  }

  public sendJSONToClient(data: unknown) {
    // TODO: look into fast-json-stringify for performant serialization
    this.client.send(JSON.stringify(data));
  }
}
