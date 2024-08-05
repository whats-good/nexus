import { WebSocket } from "ws";
import type { Logger } from "pino";
import { injectable } from "inversify";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";
import { errSerialize, wsDataToJson } from "@src/utils";
import { LoggerFactory } from "@src/logging";
import { eth_subscribe_newHeads, eth_unsubscribe } from "@src/rpc-methods";
import { InboundSubscriptionFactory } from "@src/subscriptions";
import { NexusConfig } from "@src/nexus-config";
import type { WebSocketContext } from "./ws-context";

@injectable()
export class WsContextHandler {
  private readonly logger: Logger;
  private readonly wsContexts = new WeakMap<WebSocket, WebSocketContext>();
  private readonly subscriptionSharingEnabled: boolean;

  constructor(
    private readonly inboundSubscriptionFactory: InboundSubscriptionFactory,
    config: NexusConfig,
    loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory.get(WsContextHandler.name);
    this.subscriptionSharingEnabled = config.subscriptionSharing.enabled;
  }

  public getContext(client: WebSocket) {
    return this.wsContexts.get(client);
  }

  public registerContext(context: WebSocketContext) {
    this.wsContexts.set(context.client, context);
  }

  public handleConnection(context: WebSocketContext) {
    const { client, node, endpoint } = context;

    context.once("abort", () => {
      this.wsContexts.delete(client);
    });

    node.on("message", (data) => {
      if (client.readyState !== WebSocket.OPEN) {
        context.logger.error(
          {
            nodeProvider: endpoint.nodeProvider.name,
          },
          `Received a provider message for a closed client`
        );

        return;
      }

      // TODO: handle interception, caching, event handling and so on
      context.logger.debug(
        {
          nodeProvider: endpoint.nodeProvider.name,
        },
        `Received a provider message, relaying to the client...`
      );

      client.send(data);
    });

    client.on("message", (data) => {
      context.logger.debug("Received new websocket message");

      if (client.readyState !== WebSocket.OPEN) {
        context.logger.warn(
          "Received a client message on a closed provider socket"
        );

        return;
      }

      // TODO: make this a reusable workflow. create a reusable interception flow
      // both for client messages and node messages.
      const jsonParsed = wsDataToJson(data);

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
          {
            error: rpcRequestPayloadParsed.error,
            request: jsonParsed.result, // TODO: add the request on other logs too
          },
          `Received an invalid RPC payload`
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

      if (this.subscriptionSharingEnabled) {
        // TODO: if there are no websocket endpoints available, we should
        // still try to carry the request to http endpoints. this will cover
        // a large portion of ws requests anyway.

        const eth_subscribe_newHeadsParsed =
          eth_subscribe_newHeads.safeParse(rpcRequestPayload);

        if (eth_subscribe_newHeadsParsed.success) {
          context.logger.debug("Received newHeads subscription request");

          this.inboundSubscriptionFactory.subscribe(
            context,
            eth_subscribe_newHeadsParsed.data
          );

          return;
        }

        const eth_unsubscribeParsed =
          eth_unsubscribe.safeParse(rpcRequestPayload);

        if (eth_unsubscribeParsed.success) {
          context.logger.debug("Received unsubscribe request");

          const removedInbound = context.unsubscribeByInboundId(
            eth_unsubscribeParsed.data.params[0]
          );

          if (removedInbound) {
            context.logger.debug(
              {
                id: removedInbound.id,
              },
              "Unsubscribed from shared subscription"
            );
            context.sendJSONToClient({
              id: rpcRequestPayload.id,
              jsonrpc: "2.0",
              result: true,
            });
          } else {
            context.logger.debug(
              {
                id: rpcRequestPayload.id,
              },
              "Received an unsubscribe request that wasn't in the context. Forwarding to dedicated node."
            );
          }

          return;
        }
      } else {
        context.logger.debug(
          "Subscription sharing is disabled. Not attempting to share subscriptions."
        );
      }

      context.logger.debug("Relaying the RPC request to the ws node");
      context.node.send(data);

      // TODO: how do we treat multi json rpc messages?
    });

    client.on("error", (error) => {
      context.logger.error(error, "Client socket error");
      context.abort(error);
    });

    node.on("error", (error) => {
      context.logger.error(error, "Node socket error");
      context.abort(error);
    });

    client.on("close", () => {
      context.logger.debug("Client socket closed, cleaning up...");
      context.abort(new Error("Client socket closed"));
    });

    node.on("close", () => {
      context.logger.debug("Node socket closed, cleaning up...");
      context.abort(new Error("Node socket closed"));
    });
  }
}
