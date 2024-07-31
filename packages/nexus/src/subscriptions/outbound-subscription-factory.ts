import { injectable, inject } from "inversify";
import type { Logger } from "pino";
import type { Chain } from "@src/chain";
import { LoggerFactory } from "@src/logging";
import { NodeEndpointPoolFactory } from "@src/node-endpoint";
import { WebSocketPool } from "@src/websockets/ws-pool";
import type { EthSubscribeRpcParamsType } from "@src/rpc-methods";
import { OutboundSubscription } from "./outbound-subscription";

@injectable()
export class OutboundSubscriptionFactory {
  private readonly outboundSubscriptions = new Map<
    string,
    OutboundSubscription
  >();
  private readonly logger: Logger;

  constructor(
    @inject(LoggerFactory) private readonly loggerFactory: LoggerFactory,
    @inject(NodeEndpointPoolFactory)
    private readonly nodeEndpointPoolFactory: NodeEndpointPoolFactory
  ) {
    this.logger = loggerFactory.get(OutboundSubscriptionFactory.name);
  }

  private static serializeRpcSubscriptionParams(
    chain: Chain,
    params: EthSubscribeRpcParamsType
  ): string {
    if (params.length === 1) {
      if (params[0] === "newHeads") {
        return `${chain.chainId}-newHeads`;
      }
    }

    throw new Error("Invalid subscription params");
  }

  public findOrCreate(chain: Chain, params: EthSubscribeRpcParamsType) {
    this.logger.info(
      {
        chain,
        params,
      },
      "Creating outbound subscription"
    );
    const serializedParams =
      OutboundSubscriptionFactory.serializeRpcSubscriptionParams(chain, params);

    const existing = this.outboundSubscriptions.get(serializedParams);

    if (existing) {
      this.logger.debug("Outbound subscription already exists");

      return existing;
    }

    const nodeEndpointPool = this.nodeEndpointPoolFactory.ws.get(chain);

    if (!nodeEndpointPool) {
      // TODO: we know the endpoint pool itself is stateless, so we could just inject it
      // direclty into the container. but then we need to start thinking about request scoped
      // dependencies.
      throw new Error("No node endpoint pool found");
    }

    // TODO: turn this into a factory init
    const webSocketPool = new WebSocketPool(
      nodeEndpointPool,
      this.loggerFactory
    );

    // TODO: turn this into a factory init
    const outboundSubscription = new OutboundSubscription(
      params,
      webSocketPool,
      this.loggerFactory
    );

    this.outboundSubscriptions.set(serializedParams, outboundSubscription);

    outboundSubscription.on("terminate", () => {
      // TODO: we should differentiate between fatal errors and regular termination.
      // on a fatal termination, we should close the client socket too.
      this.outboundSubscriptions.delete(serializedParams); // TODO: is this good enough? can this handle race conditions?
    });

    return outboundSubscription;
  }
}
