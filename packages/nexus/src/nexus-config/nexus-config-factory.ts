import { type Logger, pino } from "pino";
import type { AnyEventHandlerOf } from "@src/events";
import type { NexusMiddleware } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";
import { nodeRelayMiddleware } from "@src/node-relay-handler";
import { getAuthenticationMiddleware } from "@src/authentication/authentication-middleware";
import { isNonEmptyArray } from "@src/utils";
import type { EnvConfig } from "./env-config";
import { getEnvConfig } from "./env-config";
import { NexusConfig } from "./nexus-config";

export interface LogConfig {
  level: string;
}

const DEFAULT_PORT = 4000;

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
  private readonly logger: Logger;

  constructor(options?: NexusConfigOptions<TPlatformContext>) {
    this.options = options || {};
    this.envConfig = getEnvConfig();
    this.logger = this.getLogger();
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
      logger: this.logger,
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

    if (this.envConfig.overwrittenChains.length > 0) {
      this.logger.warn(
        `⚠️ Overwritten chain configs detected: ${JSON.stringify(
          this.envConfig.overwrittenChains,
          null,
          2
        )}`
      );
    }

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

  private getLogger(): Logger {
    return pino({
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          colorizeObjects: true,
        },
      },
      level: this.getLogConfig().level,
    });
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
    const portConfig = this.options.port || this.envConfig.port;

    if (!portConfig) {
      this.logger.warn(
        `️⚠️️ port is not set. Defaulting to ${DEFAULT_PORT}. Set the NEXUS_PORT environment variable, or the port option in the Nexus config to change.`
      );
    }

    return this.options.port || this.envConfig.port || DEFAULT_PORT;
  }

  private getRpcAuthMiddleware():
    | NexusMiddleware<TPlatformContext>
    | undefined {
    const rpcAuthKey = this.options.rpcAuthKey || this.envConfig.rpcAuthKey;

    if (!rpcAuthKey) {
      this.logger.warn(
        "⚠️ rpcAuthKey not set. Authentication middleware inactive. Set the NEXUS_RPC_AUTH_KEY environment variable, or the rpcAuthKey option in the Nexus config to enable."
      );
    } else {
      this.logger.info("🔒 Authentication middleware active");

      return getAuthenticationMiddleware<TPlatformContext>({
        authKey: rpcAuthKey,
      });
    }

    return undefined;
  }
}
