import type { RawData } from "ws";
import { WebSocket } from "ws";
import type { Logger } from "pino";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
import type { StaticContainer } from "@src/dependency-injection";
import { errSerialize } from "@src/utils";
import type { WsContext } from "./ws-context";

export class WsContextHandler<TPlatformContext = unknown> {
  private readonly logger: Logger;

  constructor(private container: StaticContainer<TPlatformContext>) {
    this.logger = container.logger.child({ name: this.constructor.name });
  }

  private incomingDataToJSON(data: RawData) {
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

  private handleContextCleanup(context: WsContext<TPlatformContext>) {
    const { client, node } = context;

    if (client.readyState !== WebSocket.CLOSED) {
      client.terminate(); // TODO: Is this needed? should we do a timeout here?
      this.logger.debug("Client socket terminated.");
      // TODO: handle subscription accounting and close shared subscriptions if needed
    }

    if (node.readyState !== WebSocket.CLOSED) {
      node.terminate(); // TODO: Is this needed? should we do a timeout here?
      this.logger.debug("Node socket terminated.");
    }

    this.container.wsContexts.delete(client);
  }

  public handleConnection(context: WsContext<TPlatformContext>) {
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

    client.on("message", (data) => {
      context.logger.debug("Received new websocket message");

      if (client.readyState !== WebSocket.OPEN) {
        context.logger.warn("Received a message on a closed socket");

        // TODO: what does this mean? do we need to terminate the socket here?
        return;
      }

      const jsonParsed = this.incomingDataToJSON(data);

      if (jsonParsed.kind === "error") {
        context.logger.warn(
          errSerialize(jsonParsed.error),
          "Error parsing JSON"
        );
        context.sendJSONToClient({
          // TODO: standardize these error responses
          id: null,
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
          },
        });

        return;
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
        rpcRequestPayload,
        "Received a valid RPC ws request"
      );

      // TODO: if there are no websocket endpoints available, we should
      // still try to carry the request to http endpoints. this will cover
      // a large portion of ws requests anyway.

      context.logger.debug("Relaying the RPC request to the ws node");
      context.node.send(data);

      // TODO: how do we treat multi json rpc messages?
    });

    // TODO: fix all pino logs to log the object first, and then the message. no stringify needed

    client.on("error", (error) => {
      context.logger.error(error, "Client socket error");
      // TODO: should we create a timeout to close the socket?
      this.handleContextCleanup(context);
    });

    node.on("error", (error) => {
      context.logger.error(error, "Node socket error");
      this.handleContextCleanup(context);
    });

    client.on("close", () => {
      context.logger.debug("Client socket closed, cleaning up...");
      this.handleContextCleanup(context);
    });

    node.on("close", () => {
      context.logger.debug("Node socket closed, cleaning up...");
      this.handleContextCleanup(context);
    });
  }
}
