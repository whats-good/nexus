import * as uuid from "uuid";
import type { Logger } from "pino";
import type { WebSocket } from "ws";
import { EventEmitter } from "eventemitter3";
import type { NodeEndpoint } from "@src/node-endpoint";
import type { LoggerFactory } from "@src/logging";
import { disposeSocket } from "@src/utils";
import type { InboundSubscription } from "@src/subscriptions/inbound-subscription";

/**
 * Represents a pair of websockets, one for the client and one for the node.
 */
export class WebSocketContext extends EventEmitter<{
  abort: (error: Error) => void;
}> {
  public readonly client: WebSocket;
  public readonly node: WebSocket;
  public readonly endpoint: NodeEndpoint;
  public readonly id = uuid.v4();
  public readonly logger: Logger;

  // the string is the subscription id
  private readonly subscriptions = new Map<string, InboundSubscription>();

  constructor(params: {
    client: WebSocket;
    node: WebSocket;
    endpoint: NodeEndpoint;
    loggerFactory: LoggerFactory;
  }) {
    super();
    this.client = params.client;
    this.node = params.node;
    this.endpoint = params.endpoint;
    this.logger = params.loggerFactory.get(WebSocketContext.name, {
      clientId: this.id,
    });
  }

  public get chain() {
    return this.endpoint.nodeProvider.chain;
  }

  public registerInboundSubscription(inbound: InboundSubscription) {
    this.logger.debug({ id: inbound.id }, "Registering inbound subscription");
    this.subscriptions.set(inbound.id, inbound);

    return inbound;
  }

  public sendJSONToClient(data: unknown) {
    // TODO: look into fast-json-stringify for performant serialization
    this.client.send(JSON.stringify(data));
  }

  private unsubscribe(inbound: InboundSubscription) {
    this.logger.debug({ id: inbound.id }, "Detaching inbound subscription");
    inbound.detach();
    this.subscriptions.delete(inbound.id);

    return inbound;
  }

  public unsubscribeByInboundId(id: string) {
    const inbound = this.subscriptions.get(id);

    if (!inbound) {
      this.logger.info(
        { id },
        "Requested unsubscribe request for an unknown subscription"
      );

      return;
    }

    return this.unsubscribe(inbound);
  }

  private unsubscribeAll() {
    this.logger.debug("Removing all shared subscriptions");

    for (const inbound of this.subscriptions.values()) {
      this.unsubscribe(inbound);
      // TODO: all event handlers on the outbound subscription from the inbound subscription should be stored on the inbound,
      // so that when the inbound is unsubscribed, we can remove all event handlers from the outbound that were attached by the inbound.
    }
  }

  public abort(error: Error) {
    this.logger.warn(
      {
        err: error,
        activeEventNames: this.eventNames(),
        numSubscriptions: this.subscriptions.size,
      },
      "Aborting websocket context"
    );

    disposeSocket(this.client); // TODO: maybe we should .close() instead of .terminate() on the client. this is more important than the node.
    disposeSocket(this.node); // TODO: maybe we should .close() instead of .terminate() on the node.

    this.unsubscribeAll();

    this.emit("abort", error);
    this.removeAllListeners("abort");

    this.logger.debug(
      {
        activeEventNames: this.eventNames(),
        numSubscriptions: this.subscriptions.size,
      },
      "Aborted websocket context"
    );
  }
}
