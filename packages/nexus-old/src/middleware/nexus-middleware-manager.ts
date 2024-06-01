import type { NexusContext } from "@src/rpc";
import type { NexusMiddleware } from "./nexus-middleware";

export class NexusMiddlewareManager<TServerContext> {
  constructor(
    private readonly middlewares: NexusMiddleware<TServerContext>[]
  ) {}

  public async run(context: NexusContext<TServerContext>): Promise<void> {
    const runFns: (() => Promise<void>)[] = [];

    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const currentMiddleware = this.middlewares[i];
      const nextFn = runFns[0];

      runFns.unshift(async () => {
        await currentMiddleware(context, nextFn);
      });
    }

    if (runFns.length > 0) {
      await runFns[0]();
    }
  }
}
