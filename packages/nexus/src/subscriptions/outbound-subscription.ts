/* eslint-disable @typescript-eslint/no-confusing-void-expression -- Disabling the rule for this file, because we always want to terminate execution after emitting the events, which are unfortunately void expressions */

import { EventEmitter } from "eventemitter3";
import type { WebSocket, RawData } from "ws";
import type { Logger } from "pino";
import type { WebSocketPool } from "@src/websockets/ws-pool";
import { disposeSocket, errSerialize, wsDataToJson } from "@src/utils";
import type { RpcResponseErrorFieldType } from "@src/rpc-schema";
import { RpcResponseErrorPayloadSchema } from "@src/rpc-schema";
import type {
  EthSubscribeSuccessResponsePayloadType,
  EthSubscribeRpcParamsType,
} from "@src/rpc-methods";
import {
  eth_subscribeSuccessResponsePayloadSchema,
  eth_subscriptionPayloadSchema,
} from "@src/rpc-methods";
import type { LoggerFactory } from "@src/logging";
import type { InboundSubscription } from "./inbound-subscription";

// TODO: consider breaking the outbound sub into 2 parts:
// one that deals with initializing the subscription, and another that deals with the actual subscription data.

interface FailedTerminationState {
  type: "terminated";
  kind: "failed"; // failed to start
  errorRpcField: RpcResponseErrorFieldType;
  previous: ActivatingState;
}

interface AbortedTerminationState {
  type: "terminated";
  kind: "aborted"; // terminated due to error
  error: Error;
  previous: ActiveState;
}

interface UnsubscribedTerminationState {
  type: "terminated";
  kind: "unsubscribed"; // terminated voluntarily
  previous: ActiveState | ActivatingState;
}

interface ActivatingState {
  type: "activating";
}

interface ActiveState {
  type: "active";
  successRpcResponse: EthSubscribeSuccessResponsePayloadType;
  nodeSocket: WebSocket;
  previous: ActivatingState;
}

export type TerminationState =
  | FailedTerminationState
  | AbortedTerminationState
  | UnsubscribedTerminationState;

export type OutboundSubscriptionState =
  | ActivatingState
  | ActiveState
  | TerminationState;

export class OutboundSubscription extends EventEmitter<{
  // the node has accepted the subscription, and is expected to start sending data
  activate: (response: EthSubscribeSuccessResponsePayloadType) => void; // TODO: we should just emit the "result" field, so the inbounds can assign their own ids

  // the node has sent valid data on the subscription
  data: (result: unknown) => void; // TODO: we should just emit the params.result field, so the inbounds can assign their own ids

  // the subscription has reached a terminated subscription.
  terminate: (state: TerminationState) => void;
}> {
  public state: OutboundSubscriptionState = { type: "activating" };
  private readonly logger: Logger;

  private inboundSubscriptionIds = new Set<InboundSubscription>();

  constructor(
    private readonly rpcRequestParams: EthSubscribeRpcParamsType,
    private readonly webSocketPool: WebSocketPool, // in this case, should we have an active pool of ws connections, from which we can pull a connection to use for the outbound subscription?
    // TODO: if we need to wait until the socket is open, we can't create the subscription until the socket is open, which means we can't "lock" the outbound subscription until the socket is open. so a race condition can cause multiple inbound subscriptions to recreate the outbound subscription.
    // maybe that's what the ws pool should do. instead of creating pools on demand, it should create them first, and then keep them alive until something tells it to close them.,
    loggerFactory: LoggerFactory
  ) {
    super();

    this.logger = loggerFactory.get(OutboundSubscription.name);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.webSocketPool.once("error", () => {
      switch (this.state.type) {
        case "activating": {
          // TODO: standardize this error message
          this.fail(
            {
              code: -32000,
              message: "Internal error",
            },
            this.state
          );
          break;
        }

        case "active": {
          // TODO: the outbound subscription should initialize with a working socket in the first place, so that
          // this doesn't happen.
          this.logger.error(
            "The websocket pool errored out in an active subscription. This should never happen"
          );
          this.abort(
            new Error("Internal error"),
            this.state.nodeSocket,
            this.state
          );
          break;
        }

        default: {
          this.logger.error(
            {
              state: this.state,
            },
            "Received a websocket pool event in terminated subscription"
          );
        }
      }
    });

    this.webSocketPool.once("connect", (nodeSocket) => {
      nodeSocket.on("message", (data) => {
        this.handleNodeSocketMessage(nodeSocket, data);
      });

      nodeSocket.once("close", () => {
        this.handleNodeSocketClose(nodeSocket);
      });

      nodeSocket.once("error", (error) => {
        this.handleNodeSocketError(nodeSocket, error);
      });

      nodeSocket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_subscribe",
          params: this.rpcRequestParams,
        })
      );
    });
  }

  private handleNodeSocketMessage(nodeSocket: WebSocket, data: RawData) {
    const jsonParsed = wsDataToJson(data);

    this.logger.debug({ jsonParsed }, "Message received");

    switch (this.state.type) {
      case "active": {
        if (jsonParsed.kind === "error") {
          return this.abort(new Error("Invalid JSON"), nodeSocket, this.state);
        }

        const subscriptionPayloadParsed =
          eth_subscriptionPayloadSchema.safeParse(jsonParsed.result);

        if (subscriptionPayloadParsed.success) {
          return this.emit(
            "data",
            subscriptionPayloadParsed.data.params.result
          );
        }

        return this.abort(
          // TODO: we should have a better error message here
          new Error("Invalid payload"),
          nodeSocket,
          this.state
        );
      }

      case "activating": {
        if (jsonParsed.kind === "error") {
          return this.fail(
            {
              code: -32000,
              message: "Internal error", // TODO: standardize this error message
            },
            this.state,
            nodeSocket
          );
        }

        const initSuccessParsed =
          eth_subscribeSuccessResponsePayloadSchema.safeParse(
            jsonParsed.result
          );

        if (initSuccessParsed.success) {
          return this.activate(initSuccessParsed.data, nodeSocket, this.state);
        }

        const initErrorParsed = RpcResponseErrorPayloadSchema.safeParse(
          jsonParsed.result
        );

        if (initErrorParsed.success) {
          return this.fail(initErrorParsed.data.error, this.state, nodeSocket);
        }

        this.logger.warn(
          {
            state: this.state,
            payload: jsonParsed.result,
          },
          "Received unexpected message while activating subscription"
        );

        return this.fail(
          {
            code: -32000,
            message: "Internal error", // TODO: standardize this error message
          },
          this.state,
          nodeSocket
        );
      }

      default: {
        this.logger.error(
          {
            state: this.state,
            jsonParsed,
          },
          "Received subscription message in terminated subscription.. This should never happen. Closing socket."
        );

        disposeSocket(nodeSocket);
      }
    }
  }

  private handleNodeSocketError(nodeSocket: WebSocket, error: Error) {
    this.logger.warn(errSerialize(error), "Node socket error");

    switch (this.state.type) {
      case "active": {
        this.logger.warn(
          {
            state: this.state,
          },
          "Node socket errored. Aborting subscription"
        );

        return this.abort(error, nodeSocket, this.state);
      }

      case "activating": {
        this.logger.warn(
          {
            state: this.state,
          },
          "Node socket errored. Failing subscription"
        );

        return this.fail(
          {
            code: -32000,
            message: "Internal error", // TODO: standardize this error message
          },
          this.state,
          nodeSocket
        );
      }

      default: {
        this.logger.error(
          {
            state: this.state,
          },
          "Node socket errored in a terminated subscription.. Closing socket."
        );

        disposeSocket(nodeSocket);
      }
    }
  }

  private handleNodeSocketClose(nodeSocket: WebSocket) {
    switch (this.state.type) {
      case "active": {
        this.logger.warn(
          {
            state: this.state,
          },
          "Node socket closed. Aborting subscription"
        );

        return this.abort(
          new Error("Node closed socket unexpectedly"),
          nodeSocket,
          this.state
        );
      }

      case "activating": {
        this.logger.warn(
          {
            state: this.state,
          },
          "Node socket closed. Failing subscription"
        );

        return this.fail(
          {
            code: -32000,
            message: "Internal error", // TODO: standardize this error message
          },
          this.state,
          nodeSocket
        );
      }

      default: {
        this.logger.error(
          {
            state: this.state,
          },
          "Node socket closed in a terminated subscription."
        );
      }
    }
  }

  private activate(
    response: EthSubscribeSuccessResponsePayloadType,
    nodeSocket: WebSocket,
    previous: ActiveState["previous"]
  ) {
    this.state = {
      type: "active",
      successRpcResponse: response,
      nodeSocket,
      previous,
    };

    this.emit("activate", response);
    this.removeAllListeners("activate");
  }

  private _terminate(state: TerminationState, nodeSocket?: WebSocket) {
    this.state = state;

    if (nodeSocket) {
      disposeSocket(nodeSocket);
    }

    this.inboundSubscriptionIds.clear();

    this.removeAllListeners("data");
    this.removeAllListeners("activate");

    this.emit("terminate", state);
    this.removeAllListeners("terminate");
  }

  private fail(
    rpcErrorField: RpcResponseErrorFieldType,
    previous: FailedTerminationState["previous"],
    nodeSocket?: WebSocket
  ) {
    // TODO: parse and understand the kind of error we're propagating here. if necessary, wrap around it like we do in the http rpc methods

    return this._terminate(
      {
        type: "terminated",
        kind: "failed",
        errorRpcField: rpcErrorField,
        previous,
      },
      nodeSocket
    );
  }

  private abort(
    error: Error,
    nodeSocket: WebSocket,
    previous: AbortedTerminationState["previous"]
  ) {
    return this._terminate(
      {
        type: "terminated",
        kind: "aborted",
        error,
        previous,
      },
      nodeSocket
    );
  }

  private unsubscribe(
    previous: UnsubscribedTerminationState["previous"],
    nodeSocket?: WebSocket
  ) {
    return this._terminate(
      {
        type: "terminated",
        kind: "unsubscribed",
        previous,
      },
      nodeSocket
    );
  }

  public attach(inbound: InboundSubscription) {
    this.inboundSubscriptionIds.add(inbound);

    this.once("terminate", inbound.onTerminate);
    this.on("data", inbound.onData);

    if (this.state.type === "active") {
      inbound.onActivate();
    } else if (this.state.type === "activating") {
      this.once("activate", inbound.onActivate);
    } else {
      // TODO: there are better ways to handle this.
      // first off, if the outbound was aborted, the inbound that's attempting to attach can be detached,
      // and we can dispatch a failure rpc error to the client. However what we're doing here is
      // instantly calling the `onTerminate` with the current state, which may be aborted,
      // which may then cause context.abort.

      inbound.onTerminate(this.state);
    }
  }

  public detach(inbound: InboundSubscription) {
    this.inboundSubscriptionIds.delete(inbound);

    this.removeListener("terminate", inbound.onTerminate);
    this.removeListener("data", inbound.onData);
    this.removeListener("activate", inbound.onActivate);

    this.logger.debug(
      {
        activeEventNames: this.eventNames(),
      },
      "Detached inbound subscription"
    );

    if (this.inboundSubscriptionIds.size === 0) {
      if (this.state.type === "active") {
        this.unsubscribe(this.state, this.state.nodeSocket);
      } else if (this.state.type === "activating") {
        // TODO: OutboundSubscription shouldn't even start if the node socket is undefined.
        // TODO: what if we use await once() for the outbound to activate or fail, and then we can actually attach
        // to the active outbound?
        this.unsubscribe(this.state);
      } else {
        this.logger.error(
          {
            state: this.state,
          },
          "detach called unexpectedly"
        );
      }
    }
  }
}
