import type { AnyEventHandlerOf } from "@src/events";
import type { NexusMiddleware } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";
import { nodeRelayMiddleware } from "@src/node-relay-handler";
import { getAuthenticationMiddleware } from "@src/authentication/authentication-middleware";
import { isNonEmptyArray } from "@src/utils";
import type { EnvConfig } from "./env-config";
import { getEnvConfig } from "./env-config";
import type { LogConfig } from "./nexus-config";
import { NexusConfig } from "./nexus-config";

export interface NexusConfigOptions<TPlatformContext = unknown> {
  nodeProviders?: NodeProvider[];
  relay?: Partial<RelayConfig>;
  port?: number;
  log?: LogConfig;
  eventHandlers?: AnyEventHandlerOf<TPlatformContext>[];
  middleware?: NexusMiddleware<TPlatformContext>[];
  nextTick?: typeof process.nextTick;
  rpcAuthKey?: string;
}

export class NexusConfigFactory<TPlatformContext = unknown> {
  private readonly options: NexusConfigOptions<TPlatformContext>;
  private readonly envConfig: EnvConfig;

  constructor(options?: NexusConfigOptions<TPlatformContext>) {
    this.options = options || {};
    this.envConfig = getEnvConfig();
  }

  public getNexusConfig(params: NexusConfigOptions<TPlatformContext>) {
    const nodeProviders = this.getNodeProviders();
    const uniqueChains = Array.from(
      new Set(nodeProviders.map((nodeProvider) => nodeProvider.chain))
    );

    return new NexusConfig<TPlatformContext>({
      nodeProviders,
      chains: new Map(uniqueChains.map((chain) => [chain.chainId, chain])),
      relay: this.getRelayConfig(),
      port: this.getPort(),
      log: this.getLogConfig(),
      eventHandlers: this.options.eventHandlers || [],
      middleware: this.getMiddleware(),
      // eslint-disable-next-line @typescript-eslint/unbound-method -- process.nextTick is an edge case
      nextTick: params.nextTick || process.nextTick,
    });
  }

  private getRelayConfig(): RelayConfig {
    const relayConfig: RelayConfig = {
      failure: { kind: "cycle-requests", maxAttempts: 3 },
      order: "sequential",
    };

    if (this.options.relay?.failure) {
      relayConfig.failure = this.options.relay.failure;
    } else if (this.envConfig.relay.failure) {
      relayConfig.failure = this.envConfig.relay.failure;
    }

    if (this.options.relay?.order) {
      relayConfig.order = this.options.relay.order;
    } else if (this.envConfig.relay.order) {
      relayConfig.order = this.envConfig.relay.order;
    }

    return relayConfig;
  }

  private getNodeProviders(): [NodeProvider, ...NodeProvider[]] {
    const paramNodeProviders = this.options.nodeProviders || [];
    const combinedNodeProviders = paramNodeProviders.concat(
      this.envConfig.nodeProviders
    );

    if (!isNonEmptyArray(combinedNodeProviders)) {
      throw new Error("No node providers configured");
    }

    return combinedNodeProviders;
  }

  private getMiddleware(): NexusMiddleware<TPlatformContext>[] {
    const middleware: NexusMiddleware<TPlatformContext>[] =
      this.options.middleware || [];

    const rpcAuthMiddleware = this.getRpcAuthMiddleware();

    if (rpcAuthMiddleware) {
      // we prepend the rpc auth middleware to the given middleware
      // so that it is the first middleware to run
      middleware.unshift(rpcAuthMiddleware);
    }

    // we create the relay middleware on the spot, and append it to the given middleware
    middleware.push(nodeRelayMiddleware);

    return middleware;
  }

  private getLogConfig(): LogConfig {
    const logConfig: LogConfig = { level: "info" };

    if (this.options.log?.level) {
      logConfig.level = this.options.log.level;
    } else if (this.envConfig.logLevel) {
      logConfig.level = this.envConfig.logLevel;
    }

    return logConfig;
  }

  private getPort(): number {
    return this.options.port || this.envConfig.port || 4000;
  }

  private getRpcAuthMiddleware():
    | NexusMiddleware<TPlatformContext>
    | undefined {
    const rpcAuthKey = this.options.rpcAuthKey || this.envConfig.rpcAuthKey;

    if (rpcAuthKey) {
      return getAuthenticationMiddleware<TPlatformContext>({
        authKey: rpcAuthKey,
      });
    }

    return undefined;
  }
}
