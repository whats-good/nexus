import type { Chain } from "@src/chain";
import type { NexusRpcContext } from "@src/dependency-injection/nexus-rpc-context";
import type { AnyEventHandlerOf } from "@src/events";
import type { NexusMiddleware, NexusMiddlewareNextFn } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import { NodeProvider } from "@src/node-provider";
import { NodeRelayHandler } from "@src/node-relay-handler";
import { CHAIN } from "@src/default-chains";
import { EnvSchema } from "./env-config";

export interface LogConfig {
  level: string;
}

export interface NexusConfigOptions<TPlatformContext = unknown> {
  nodeProviders?: NodeProvider[];
  relay?: RelayConfig;
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
    nodeProviders: NodeProvider[];
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

  private static getEnvConfig() {
    const env = EnvSchema.parse(process.env);
    const defaultChains = Object.values(CHAIN);
    const chainsMap = new Map(
      defaultChains.map((chain) => [chain.chainId, chain])
    );

    env.CHAINS?.forEach((chain) => {
      // TODO: add warning logs
      chainsMap.set(chain.chainId, chain);
    });

    const nodeProviders = env.NODE_PROVIDERS?.map((nodeProvider) => {
      const chain = chainsMap.get(nodeProvider.chainId);

      if (!chain) {
        throw new Error(
          `NodeProvider configured with unregistered chainId: ${nodeProvider.chainId}. Add the chain to the CHAINS env variable.`
        );
      }

      return new NodeProvider({
        name: nodeProvider.name,
        url: nodeProvider.url,
        chain,
      });
    });

    return {
      nodeProviders: nodeProviders || [],
      port: env.PORT,
      logLevel: env.LOG_LEVEL,
    };
  }

  public static init<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>
  ) {
    const envConfig = NexusConfig.getEnvConfig();
    const combinedNodeProviders = envConfig.nodeProviders.concat(
      params.nodeProviders || []
    );

    if (combinedNodeProviders.length === 0) {
      throw new Error(
        "No NodeProviders configured. Add them via NODE_PROVIDERS env variable or NexusConfigOptions.nodeProviders."
      );
    }

    const uniqueChains = Array.from(
      new Set(combinedNodeProviders.map((nodeProvider) => nodeProvider.chain))
    );

    const chainsMap = new Map(
      uniqueChains.map((chain) => [chain.chainId, chain])
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
      nodeProviders: combinedNodeProviders,
      chains: chainsMap,
      relay: params.relay || {
        order: "sequential",
        failure: { kind: "cycle-requests", maxAttempts: 3 },
      },
      port: params.port || envConfig.port,
      log: params.log || { level: envConfig.logLevel || "info" },
      eventHandlers: params.eventHandlers || [],
      middleware,
      // eslint-disable-next-line @typescript-eslint/unbound-method -- process.nextTick is an edge case
      nextTick: params.nextTick || process.nextTick,
    });
  }
}
