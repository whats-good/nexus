import type { Chain } from "@src/chain";
import type { NexusRpcContext } from "@src/dependency-injection/nexus-rpc-context";
import type { AnyEventHandlerOf } from "@src/events";
import type { NexusMiddleware, NexusMiddlewareNextFn } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";
import { NodeRelayHandler, nodeRelayMiddleware } from "@src/node-relay-handler";
import { isNonEmptyArray } from "@src/utils";
import { authenticationMiddleware } from "@src/authentication/authentication-middleware";
import { getEnvConfig, type EnvConfig } from "./env-config";

export interface LogConfig {
  level: string;
}

export interface NexusConfigOptions<TPlatformContext = unknown> {
  nodeProviders?: NodeProvider[];
  relay?: Partial<RelayConfig>;
  port?: number;
  log?: LogConfig;
  eventHandlers?: AnyEventHandlerOf<TPlatformContext>[];
  middleware?: NexusMiddleware<TPlatformContext>[];
  nextTick?: typeof process.nextTick;
}

export class NexusConfig<TPlatformContext = unknown> {
  public readonly nodeProviders: [NodeProvider, ...NodeProvider[]];
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
      eventHandlers: `Found ${this.eventHandlers.length} event handler(s)`,
      middleware: `Found ${this.middleware.length} middleware`,
    };
  }

  private static getRelayConfig<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>,
    envConfig: EnvConfig
  ): RelayConfig {
    const relayConfig: RelayConfig = {
      failure: { kind: "cycle-requests", maxAttempts: 3 },
      order: "sequential",
    };

    if (params.relay?.failure) {
      relayConfig.failure = params.relay.failure;
    } else if (envConfig.relay.failure) {
      relayConfig.failure = envConfig.relay.failure;
    }

    if (params.relay?.order) {
      relayConfig.order = params.relay.order;
    } else if (envConfig.relay.order) {
      relayConfig.order = envConfig.relay.order;
    }

    return relayConfig;
  }

  private static getNodeProviders<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>,
    envConfig: EnvConfig
  ): [NodeProvider, ...NodeProvider[]] {
    const paramNodeProviders = params.nodeProviders || [];
    const combinedNodeProviders = paramNodeProviders.concat(
      envConfig.nodeProviders
    );

    if (!isNonEmptyArray(combinedNodeProviders)) {
      throw new Error("No node providers configured");
    }

    return combinedNodeProviders;
  }

  private static getMiddleware<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>,
    envConfig: EnvConfig
  ): NexusMiddleware<TPlatformContext>[] {
    const middleware: NexusMiddleware<TPlatformContext>[] =
      params.middleware || [];

    const hasAuthenticationMiddleware = middleware.some(
      (m) => m.name === authenticationMiddleware.name
    );

    if (!hasAuthenticationMiddleware && envConfig.authKey) {
      // we check if the auth middleware is already present in the middleware chain.
      // if not, we prepend it to the middleware chain so that it's the
      // first middleware to be executed

      middleware.unshift(
        authenticationMiddleware({ authKey: envConfig.authKey })
      );
    }

    // we create the relay middleware on the spot, and append it to the given middleware
    middleware.push(nodeRelayMiddleware);

    return middleware;
  }

  private static getLogConfig<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>,
    envConfig: EnvConfig
  ): LogConfig {
    const logConfig: LogConfig = { level: "info" };

    if (params.log?.level) {
      logConfig.level = params.log.level;
    } else if (envConfig.logLevel) {
      logConfig.level = envConfig.logLevel;
    }

    return logConfig;
  }

  private static getPort<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>,
    envConfig: EnvConfig
  ): number {
    return params.port || envConfig.port || 4000;
  }

  public static init<TPlatformContext>(
    params: NexusConfigOptions<TPlatformContext>
  ) {
    const envConfig = getEnvConfig();
    const nodeProviders = NexusConfig.getNodeProviders(params, envConfig);
    const uniqueChains = Array.from(
      new Set(nodeProviders.map((nodeProvider) => nodeProvider.chain))
    );

    return new NexusConfig<TPlatformContext>({
      nodeProviders,
      chains: new Map(uniqueChains.map((chain) => [chain.chainId, chain])),
      relay: NexusConfig.getRelayConfig(params, envConfig),
      port: NexusConfig.getPort(params, envConfig),
      log: NexusConfig.getLogConfig(params, envConfig),
      eventHandlers: params.eventHandlers || [],
      middleware: NexusConfig.getMiddleware(params, envConfig),
      // eslint-disable-next-line @typescript-eslint/unbound-method -- process.nextTick is an edge case
      nextTick: params.nextTick || process.nextTick,
    });
  }
}
