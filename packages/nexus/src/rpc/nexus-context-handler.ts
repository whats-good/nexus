import { NexusContext } from "./nexus-context";
import { InternalErrorResponse } from "./rpc-response";
import { NexusResponse } from "@src/controller/nexus-response";
import { NexusConfig } from "@src/config";
import { NexusMiddleware, NexusMiddlewareManager } from "@src/middleware";
import { requestFilterMiddleware } from "./request-filter-middleware";
import { cannedResponseMiddleware } from "./canned-response-middleware";
import { cacheMiddleware } from "./cache-middleware";
import { relayMiddleware } from "./relay-middleware";

export class NexusContextHandler<TServerContext> {
  private readonly middlewares: NexusMiddleware<TServerContext>[];

  constructor(args: { middlewares: NexusMiddleware<TServerContext>[] }) {
    this.middlewares = [
      ...args.middlewares,
      requestFilterMiddleware,
      cannedResponseMiddleware,
      cacheMiddleware,
      relayMiddleware,
    ];
  }

  public static fromConfig<TServerContext>(
    config: NexusConfig<TServerContext>
  ): NexusContextHandler<TServerContext> {
    return new NexusContextHandler({
      middlewares: config.middlewares,
    });
  }

  public async handle(
    context: NexusContext<TServerContext>
  ): Promise<NexusResponse> {
    const middlewareManager = new NexusMiddlewareManager(
      this.middlewares,
      context
    );

    await middlewareManager.run();

    if (!context.response) {
      return new InternalErrorResponse(context.request.getResponseId());
    }

    return context.response;
  }
}
