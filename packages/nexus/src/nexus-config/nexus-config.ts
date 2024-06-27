import type { Chain } from "@src/chain";
import type { NexusRpcContext } from "@src/dependency-injection/nexus-rpc-context";
import type { AnyEventHandlerOf } from "@src/events";
import type { NexusMiddleware, NexusMiddlewareNextFn } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";
import { NodeRelayHandler } from "@src/node-relay-handler";

export interface LogConfig {
  level: string;
}

export interface NexusConfigOptions<TPlatformContext = unknown> {
  nodeProviders: [NodeProvider, ...NodeProvider[]];
  relay?: Partial<RelayConfig>;
  port?: number;
  log?: LogConfig;
  eventHandlers?: AnyEventHandlerOf<TPlatformContext>[];
  middleware?: NexusMiddleware<TPlatformContext>[];
  nextTick?: typeof process.nextTick;
}

export class NexusConfig<TPlatformContext = unknown> {
  public readonly nodeProviders: NodeProvider[];
  public readonly chains: Map<number, Chain>;
  public readonly relay: RelayConfig;
  public readonly log: LogConfig;
  public readonly port?: number;
  public readonly eventHandlers: AnyEventHandlerOf<TPlatformContext>[];
  public readonly middleware: NexusMiddleware<TPlatformContext>[];
  public readonly nextTick: typeof process.nextTick;

  private constructor(params: {
    nodeProviders: [NodeProvider, ...NodeProvider[]];
    chains: Map<number, Chain>;
    relay: RelayConfig;
    log: LogConfig;
    port?: number;
    eventHandlers: AnyEventHandlerOf<TPlatformContext>[];
    middleware: NexusMiddleware<TPlatformContext>[];
    nextTick: typeof process.nextTick;
  }) {
    this.nodeProviders = params.nodeProviders;
    this.chains = params.chains;
    this.relay = params.relay;
    this.port = params.port;
    this.log = params.log;
    this.eventHandlers = params.eventHandlers;
    this.middleware = params.middleware;
    this.nextTick = params.nextTick;
  }

  // a summary object that removes potentially sensitive information
  public summary() {
    return {
      nodeProviders: this.nodeProviders.map(
        (nodeProvider) => nodeProvider.name
      ),
      chains: Array.from(this.chains.values()),
      relay: this.relay,
      port: this.port,
      log: this.log,
      eventHandlers: `Found ${this.eventHandlers.length} event handlers`,
      middleware: `Found ${this.middleware.length} middleware`,
    };
  }

  private static getRelayConfig<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>
  ): RelayConfig {
    const relayConfig: RelayConfig = {
      failure: { kind: "cycle-requests", maxAttempts: 3 },
      order: "sequential",
    };

    if (params.relay?.failure) {
      relayConfig.failure = params.relay.failure;
    }

    if (params.relay?.order) {
      relayConfig.order = params.relay.order;
    }

    return relayConfig;
  }

  public static init<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>
  ) {
    const uniqueChains = Array.from(
      new Set(params.nodeProviders.map((nodeProvider) => nodeProvider.chain))
    );

    const givenMiddleare = params.middleware || [];

    // we create the relay middleware on the spot, and append it to the given middleware
    const middleware = givenMiddleare.concat([
      async (
        ctx: NexusRpcContext<TPlatformContext>,
        next: NexusMiddlewareNextFn
      ): Promise<void> => {
        const nodeRelayHandler = new NodeRelayHandler(ctx);
        const response = await nodeRelayHandler.handle();

        ctx.setResponse(response);

        return next();
      },
    ]);

    return new NexusConfig<TPlatformContext>({
      nodeProviders: params.nodeProviders,
      chains: new Map(uniqueChains.map((chain) => [chain.chainId, chain])),
      relay: NexusConfig.getRelayConfig(params),
      port: params.port,
      log: params.log || { level: "info" },
      eventHandlers: params.eventHandlers || [],
      middleware,
      // eslint-disable-next-line @typescript-eslint/unbound-method -- process.nextTick is an edge case
      nextTick: params.nextTick || process.nextTick,
    });
  }
}
