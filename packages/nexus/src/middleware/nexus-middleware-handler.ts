import type { Logger } from "pino";
import type { NexusRpcContext } from "@src/dependency-injection";
import { errSerialize } from "@src/utils";
import type { NexusMiddleware } from "./nexus-middleware";

export class NexusMiddlewareHandler<TPlatformContext = unknown> {
  private readonly middleware: NexusMiddleware<TPlatformContext>[];
  private readonly ctx: NexusRpcContext<TPlatformContext>;
  private readonly logger: Logger;

  constructor(params: {
    middleware: NexusMiddleware<TPlatformContext>[];
    ctx: NexusRpcContext<TPlatformContext>;
  }) {
    this.middleware = params.middleware;
    this.ctx = params.ctx;
    this.logger = this.ctx.container.logger.child({
      name: this.constructor.name,
    });
  }

  public async handle() {
    await this.composeMiddleware(0);
  }

  private async composeMiddleware(index: number) {
    if (index === this.middleware.length) {
      return;
    }

    const next = async () => {
      await this.composeMiddleware(index + 1);
    };

    try {
      await this.middleware[index](this.ctx, next);
    } catch (e) {
      const name = this.middleware[index].name || "anonymous";

      this.logger.error(errSerialize(e), `Middleware failed. Name: ${name}`);
    }
  }
}
