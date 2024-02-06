import { NexusContext } from "@src/rpc";
import { NexusMiddleware } from "./nexus-middleware";

const NULL_FN = async () => {};

export class NexusMiddlewareManager<TServerContext> {
  constructor(
    private readonly middlewares: NexusMiddleware<TServerContext>[],
    private readonly context: NexusContext<TServerContext>
  ) {}

  public async run(): Promise<void> {
    const runFns: Array<() => Promise<void>> = [NULL_FN];
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const currentMiddleware = this.middlewares[i];
      const nextFn = runFns[0];
      runFns.unshift(async () => {
        await currentMiddleware(this.context, nextFn);
      });
    }
    await runFns[0]();
  }
}
