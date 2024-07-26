import type { Logger } from "pino";
import { injectable } from "tsyringe";
import { StaticContainer } from "@src/dependency-injection";
import { errSerialize } from "@src/utils";
import type { NexusRpcContext } from "@src/nexus-rpc-context";
import { NexusConfig } from "@src/nexus-config";
import type { NexusMiddleware } from "./nexus-middleware";

@injectable()
export class NexusMiddlewareHandler {
  private readonly middleware: NexusMiddleware[];
  private readonly logger: Logger;

  constructor(
    config: NexusConfig,
    private readonly container: StaticContainer
  ) {
    this.middleware = config.middleware;
    this.logger = container.getLogger(NexusMiddlewareHandler.name);
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
      await this.middleware[index](ctx, this.container, next);
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
