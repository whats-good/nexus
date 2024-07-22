import { pino } from "pino";
import type { LoggerOptions, Logger } from "pino";
import type { NexusMiddleware } from "@src/middleware";
import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";
import { nodeRelayMiddleware } from "@src/node-relay-handler";
import { authMiddleware } from "@src/auth";
import { isNonEmptyArray } from "@src/utils";
import type { EnvConfig } from "./env-config";
import { getEnvConfig } from "./env-config";
import { NexusConfig } from "./nexus-config";

interface LogConfigOptions {
  level?: string;
  colorize?: boolean;
}

interface LogConfig {
  level: string;
  colorize: boolean;
}

const DEFAULT_PORT = 4000;

export interface NexusConfigOptions<TPlatformContext = unknown> {
  nodeProviders?: NodeProvider[];
  relay?: Partial<RelayConfig>;
  port?: number;
  log?: LogConfigOptions;
  middleware?: NexusMiddleware<TPlatformContext>[];
  rpcAuthKey?: string;
  env?: Record<string, string | undefined>;
}

export class NexusConfigFactory<TPlatformContext = unknown> {
  private readonly options: NexusConfigOptions<TPlatformContext>;
  private readonly envConfig: EnvConfig;
  private readonly logger: Logger;

  constructor(options?: NexusConfigOptions<TPlatformContext>) {
    this.options = options || {};
    this.envConfig = getEnvConfig(this.getEnv());
    this.logger = this.getLogger();
  }

  private getEnv() {
    if (this.options.env) {
      return this.options.env;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- process is not always defined. for example, in cloudflare workers
    } else if (process) {
      return process.env;
    }

    return {};
  }

  public getNexusConfig() {
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
      middleware: this.getMiddleware(),
      authKey: this.getAuthKey(),
    });
  }

  private getAuthKey(): string | undefined {
    const authKey = this.options.rpcAuthKey || this.envConfig.rpcAuthKey;

    if (!authKey) {
      this.logger.warn(
        "⚠️ rpcAuthKey not set. Auth middleware inactive. Set the NEXUS_RPC_AUTH_KEY environment variable, or the rpcAuthKey option in the Nexus config to enable."
      );
    } else {
      this.logger.info("🔒 Auth middleware active");
    }

    return authKey;
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
        {
          overwrittenChains: this.envConfig.overwrittenChains,
        },
        "⚠️ Overwritten chain configs detected"
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

    middleware.push(authMiddleware);
    middleware.push(nodeRelayMiddleware);

    return middleware;
  }

  private getLogger(): Logger {
    let transport: LoggerOptions["transport"] | undefined;
    const logConfig = this.getLogConfig();

    if (logConfig.colorize) {
      transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          colorizeObjects: true,
        },
      };
    }

    return pino({
      transport,
      level: logConfig.level,
    });
  }

  private getLogConfig(): LogConfig {
    const logConfig: LogConfig = { level: "info", colorize: true };

    if (typeof this.options.log?.level === "string") {
      logConfig.level = this.options.log.level;
    } else if (typeof this.envConfig.logLevel === "string") {
      logConfig.level = this.envConfig.logLevel;
    }

    if (typeof this.options.log?.colorize === "boolean") {
      logConfig.colorize = this.options.log.colorize;
    } else if (typeof this.envConfig.logColorize === "boolean") {
      logConfig.colorize = this.envConfig.logColorize;
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
}
