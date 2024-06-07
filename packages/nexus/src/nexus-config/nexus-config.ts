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
  relay: RelayConfig;
  port?: number;
  log?: LogConfig;
  eventHandlers?: AnyEventHandlerOf<TPlatformContext>[];
  middleware?: NexusMiddleware<TPlatformContext>[];
}

export class NexusConfig<TPlatformContext = unknown> {
  public readonly nodeProviders: NodeProvider[];
  public readonly chains: Map<number, Chain>;
  public readonly relay: RelayConfig;
  public readonly log: LogConfig;
  public readonly port?: number;
  public readonly eventHandlers: AnyEventHandlerOf<TPlatformContext>[];
  public readonly middleware: NexusMiddleware<TPlatformContext>[];

  private constructor(params: {
    nodeProviders: [NodeProvider, ...NodeProvider[]];
    chains: Map<number, Chain>;
    relay: RelayConfig;
    log: LogConfig;
    port?: number;
    eventHandlers: AnyEventHandlerOf<TPlatformContext>[];
    middleware: NexusMiddleware<TPlatformContext>[];
  }) {
    this.nodeProviders = params.nodeProviders;
    this.chains = params.chains;
    this.relay = params.relay;
    this.port = params.port;
    this.log = params.log;
    this.eventHandlers = params.eventHandlers;
    this.middleware = params.middleware;
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
      relay: params.relay,
      port: params.port,
      log: params.log || { level: "info" },
      eventHandlers: params.eventHandlers || [],
      middleware,
    });
  }
}
