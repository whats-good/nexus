import { NexusConfig, NexusConfigOptions } from "@src/config";
import {
  IntString,
  NexusNotFoundResponse,
  PathParamsOf,
  Route,
} from "@src/controller";
import { IRunEvents } from "@src/events";
import { NexusContext } from "@src/rpc";
import { NexusContextFactory } from "@src/rpc/nexus-context-factory";
import { InternalErrorResponse } from "@src/rpc/rpc-response";
import { safeAsyncNextTick } from "@src/utils";
import {
  ServerAdapter,
  ServerAdapterBaseObject,
  createServerAdapter,
} from "@whatwg-node/server";
import { z } from "zod";

type NexusServerInstance<TServerContext> = ServerAdapter<
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
  private constructor(
    private readonly options: NexusConfigOptions<TServerContext>
  ) {}

  private async handleNexusContext(context: NexusContext<TServerContext>) {
    const bus = context.config
      .eventBus as unknown as IRunEvents<TServerContext>;
    const { logger } = context.config;
    const { middlewareManager } = context.config;
    await middlewareManager.run(context);

    if (!context.response) {
      return new InternalErrorResponse(
        context.request.getResponseId()
      ).buildResponse();
    }

    safeAsyncNextTick(
      async () => {
        logger.debug("running events");
        await bus.runEvents(context.config);
      },
      () => {}
    );

    logger.debug("sending response");
    return context.response.buildResponse();
  }

  private async handleChainIdRoute(
    config: NexusConfig<TServerContext>,
    request: Request,
    params: PathParamsOf<typeof chainIdRoute>
  ) {
    const nexusContextFactory = new NexusContextFactory(config);

    const result = await nexusContextFactory.from(request, params);
    if (result.kind === "success") {
      return this.handleNexusContext(result.context);
    } else {
      return result.response.buildResponse();
    }
  }

  public handle = async (
    request: Request,
    serverContext: TServerContext
  ): Promise<Response> => {
    const config = NexusConfig.fromOptions(this.options, {
      context: serverContext,
      request,
    });

    const chainIdParams = chainIdRoute.match(request.url);

    if (chainIdParams) {
      return this.handleChainIdRoute(config, request, chainIdParams);
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
