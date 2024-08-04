import { injectable } from "inversify";
import type { Logger } from "pino";
import { LoggerFactory } from "@src/logging";
import type { WebSocketContext } from "@src/websockets";
import type { EthSubscribeRpcPayloadType } from "@src/rpc-methods";
import { generateHexId } from "@src/utils";
import { OutboundSubscriptionFactory } from "./outbound-subscription-factory";
import { InboundSubscription } from "./inbound-subscription";
import type { TerminationState } from "./outbound-subscription";

@injectable()
export class InboundSubscriptionFactory {
  private readonly logger: Logger;

  constructor(
    private readonly outboundSubscriptionFactory: OutboundSubscriptionFactory,
    private readonly loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory.get(InboundSubscriptionFactory.name);
  }

  public subscribe(
    context: WebSocketContext,
    request: EthSubscribeRpcPayloadType
  ) {
    const subscriptionId = generateHexId();

    this.logger.info(
      {
        chain: context.chain,
        request,
      },
      "Creating inbound subscription"
    );

    const outboundSubscription = this.outboundSubscriptionFactory.findOrCreate(
      context.chain,
      request.params
    );

    function onActivate() {
      context.sendJSONToClient({
        id: request.id,
        jsonrpc: "2.0",
        result: subscriptionId,
      });
    }

    function onData(result: unknown) {
      context.sendJSONToClient({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: {
          result,
          subsription: subscriptionId,
        },
      });
    }

    function onDetach(this: InboundSubscription) {
      outboundSubscription.detach(this);
      context.unsubscribeByInboundId(subscriptionId);
    }

    function onTerminate(this: InboundSubscription, state: TerminationState) {
      switch (state.kind) {
        case "failed": {
          context.sendJSONToClient({
            id: request.id,
            error: state.errorRpcField,
          });
          break;
        }

        case "aborted": {
          context.abort(state.error);
          // TODO: ^ if the inbound tries to attach to a terminated outbound, this will cause the context to abort. Instead, we should just detach the inbound.
          // and call the "onFail" handler.
          break;
        }

        case "unsubscribed": {
          context.logger.error(
            {
              state,
            },
            "Inbound subscription is holding a reference to an outbound subscription that has been unsubscribed. This should never happen."
          );
          context.abort(
            new Error(
              "Inbound subscription still holds reference to unsubscribed outbound subscription"
            )
          );
          // TODO:^ this can only happen if the inbound tries to attach to a terminated outbound.
          // This is a sign of a race condition.
          break;
        }
      }

      this.detach();
    }

    const inboundSubscription = new InboundSubscription(
      subscriptionId,
      onActivate,
      onData,
      onTerminate,
      onDetach,
      this.loggerFactory.get(InboundSubscription.name, {
        id: subscriptionId,
      })
    );

    outboundSubscription.attach(inboundSubscription);
    context.registerInboundSubscription(inboundSubscription);

    return inboundSubscription;
  }
}
