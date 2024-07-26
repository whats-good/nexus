import type { Logger } from "pino";
import { inject, injectable } from "inversify";
import { errSerialize } from "@src/utils";
import type { NexusRpcContext } from "@src/nexus-rpc-context";
import { NexusConfig } from "@src/nexus-config";
import { authMiddleware } from "@src/auth";
import { LoggerFactory } from "@src/logging";
import type { NexusMiddleware } from "./nexus-middleware";

@injectable()
export class NexusMiddlewareHandler {
  private readonly middleware: NexusMiddleware[];
  private readonly logger: Logger;

  constructor(
    @inject(NexusConfig) config: NexusConfig,
    @inject(LoggerFactory) loggerFactory: LoggerFactory
  ) {
    this.middleware = [...config.middleware, authMiddleware];
    this.logger = loggerFactory.get(NexusMiddlewareHandler.name);
  }

  public async handle(ctx: NexusRpcContext) {
    await this.composeMiddleware(0, ctx);
  }

  private async composeMiddleware(index: number, ctx: NexusRpcContext) {
    if (index === this.middleware.length) {
      return;
    }

    const next = async () => {
      await this.composeMiddleware(index + 1, ctx);
    };

    try {
      await this.middleware[index](ctx, next);
    } catch (e) {
      const name = this.middleware[index].name || "anonymous";

      this.logger.error(
        errSerialize(e, {
          middleware: name,
        }),
        `Middleware failed`
      );
    }
  }
}
