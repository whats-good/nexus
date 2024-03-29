import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import { z } from "zod";
import type { NexusConfigOptions } from "@src/config";
import type { PathParamsOf } from "@src/controller";
import { IntString, NexusNotFoundResponse, Route } from "@src/controller";
import type { RunEvents } from "@src/events";
import type { NexusContext } from "@src/rpc";
import { NexusContextFactory } from "@src/rpc/nexus-context-factory";
import { InternalErrorResponse } from "@src/rpc/rpc-response";
import { safeJsonStringify } from "@src/utils";
import { Container } from "@src/dependency-injection";

export type NexusServerInstance<TServerContext> = ServerAdapter<
  TServerContext,
  Nexus<TServerContext>
>;

const chainIdRoute = new Route(
  "(.*)/:chainId",
  z.object({
    chainId: IntString,
  })
);

export class Nexus<TServerContext>
  implements ServerAdapterBaseObject<TServerContext>
{
  public readonly port?: number;
  private constructor(
    private readonly options: NexusConfigOptions<TServerContext>
  ) {
    this.port = options.port;
  }

  private async handleNexusContext(context: NexusContext<TServerContext>) {
    const bus = context.container
      .eventBus as unknown as RunEvents<TServerContext>;
    const { logger } = context.container;
    const { middlewareManager } = context.container;

    await middlewareManager.run(context);

    if (!context.response) {
      return new InternalErrorResponse(
        context.request.getResponseId()
      ).buildResponse();
    }

    context.container.deferAsync(async () => {
      logger.debug("running events");

      try {
        await bus.runEvents(context.container);
      } catch (error) {
        logger.error(`Error while running events: ${safeJsonStringify(error)}`);
      }
    });

    logger.debug("sending response");

    return context.response.buildResponse();
  }

  private async handleChainIdRoute(
    container: Container<TServerContext>,
    params: PathParamsOf<typeof chainIdRoute>
  ) {
    const nexusContextFactory = new NexusContextFactory(container);

    const result = await nexusContextFactory.from(container.request, params);

    if (result.kind === "success") {
      return this.handleNexusContext(result.context);
    }

    return result.response.buildResponse();
  }

  public handle = async (
    request: Request,
    serverContext: TServerContext
  ): Promise<Response> => {
    const container = Container.fromOptionsAndRequest(this.options, {
      context: serverContext,
      request,
    });

    const url = new URL(request.url);
    const chainIdParams = chainIdRoute.match(url.pathname);

    if (chainIdParams) {
      return this.handleChainIdRoute(container, chainIdParams);
    }

    return new NexusNotFoundResponse().buildResponse();
  };

  public static create<TServerContext>(
    options: NexusConfigOptions<TServerContext>
  ) {
    const server = new Nexus(options);

    return createServerAdapter<TServerContext, Nexus<TServerContext>>(
      server
    ) as unknown as NexusServerInstance<TServerContext>;
  }
}
