import type { Logger } from "pino";
import type { StaticContainer } from "@src/dependency-injection";
import { errSerialize } from "@src/utils";
import type { NexusRpcContext } from "@src/nexus-rpc-context";
import type { NexusMiddleware } from "./nexus-middleware";

export class NexusMiddlewareHandler {
  private readonly middleware: NexusMiddleware[];
  private readonly logger: Logger;
  private readonly container: StaticContainer;

  constructor(params: {
    middleware: NexusMiddleware[];
    container: StaticContainer;
  }) {
    this.middleware = params.middleware;
    this.container = params.container;
    this.logger = params.container.getLogger(NexusMiddlewareHandler.name);
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
