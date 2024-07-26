import type { RawData } from "ws";
import { WebSocket } from "ws";
import type { Logger } from "pino";
import { injectable } from "inversify";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
import { errSerialize } from "@src/utils";
import { LoggerFactory } from "@src/logging";
import type { WebSocketPair } from "./ws-pair";

@injectable()
export class WsPairHandler {
  private readonly logger: Logger;
  private readonly wsPairs = new Map<WebSocket, WebSocketPair>();

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.get(WsPairHandler.name);
  }

  public getWsPair(client: WebSocket) {
    return this.wsPairs.get(client);
  }

  public registerWsPair(pair: WebSocketPair) {
    this.wsPairs.set(pair.client, pair);
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

  private handleCleanup(pair: WebSocketPair) {
    const { client, node } = pair;

    if (client.readyState !== WebSocket.CLOSED) {
      client.terminate(); // TODO: Is this needed? should we do a timeout here?
      this.logger.debug("Client socket terminated.");
      // TODO: handle subscription accounting and close shared subscriptions if needed
    }

    if (node.readyState !== WebSocket.CLOSED) {
      node.terminate(); // TODO: Is this needed? should we do a timeout here?
      this.logger.debug("Node socket terminated.");
    }

    this.wsPairs.delete(client);
  }

  public handleConnection(pair: WebSocketPair) {
    const { client, node, endpoint } = pair;
    // TODO: node-level errors and close events should trigger client cleanup, and vice versa

    node.on("message", (data) => {
      // TODO: emit events for successful and failed messages from the node
      if (client.readyState !== WebSocket.OPEN) {
        pair.logger.error(
          {
            nodeProvider: endpoint.nodeProvider.name,
          },
          `Received a provider message for a closed client`
        );

        return;
      }

      // TODO: handle interception, caching, event handling and so on
      pair.logger.debug(
        {
          nodeProvider: endpoint.nodeProvider.name,
        },
        `Received a provider message, relaying to the client...`
      );

      client.send(data);
    });

    client.on("message", (data) => {
      pair.logger.debug("Received new websocket message");

      if (client.readyState !== WebSocket.OPEN) {
        pair.logger.warn("Received a message on a closed socket");

        // TODO: what does this mean? do we need to terminate the socket here?
        return;
      }

      const jsonParsed = this.incomingDataToJSON(data);

      if (jsonParsed.kind === "error") {
        pair.logger.warn(errSerialize(jsonParsed.error), "Error parsing JSON");
        pair.sendJSONToClient({
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
        pair.logger.warn(
          {
            error: rpcRequestPayloadParsed.error,
            request: jsonParsed.result, // TODO: add the request on other logs too
          },
          `Received an invalid RPC payload`
        );
        pair.sendJSONToClient({
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

      pair.logger.debug(rpcRequestPayload, "Received a valid RPC ws request");

      // TODO: if there are no websocket endpoints available, we should
      // still try to carry the request to http endpoints. this will cover
      // a large portion of ws requests anyway.

      pair.logger.debug("Relaying the RPC request to the ws node");
      pair.node.send(data);

      // TODO: how do we treat multi json rpc messages?
    });

    // TODO: fix all pino logs to log the object first, and then the message. no stringify needed

    client.on("error", (error) => {
      pair.logger.error(error, "Client socket error");
      // TODO: should we create a timeout to close the socket?
      this.handleCleanup(pair);
    });

    node.on("error", (error) => {
      pair.logger.error(error, "Node socket error");
      this.handleCleanup(pair);
    });

    client.on("close", () => {
      pair.logger.debug("Client socket closed, cleaning up...");
      this.handleCleanup(pair);
    });

    node.on("close", () => {
      pair.logger.debug("Node socket closed, cleaning up...");
      this.handleCleanup(pair);
    });
  }
}
