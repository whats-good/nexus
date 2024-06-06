import type { Logger } from "pino";
import type { NexusRpcContext } from "@src/dependency-injection";
import { safeErrorStringify } from "@src/utils";
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
    this.logger = this.ctx.parent.logger.child({ name: this.constructor.name });
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
      this.logger.error(`Middleware failed. Error: ${safeErrorStringify(e)}`);
    }
  }
}
