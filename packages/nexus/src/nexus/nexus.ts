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
    private readonly options: NexusConfigOptions<TServerContext> // TODO: break config into 2 parts: static and dynamic. the first one should
    // functions at best, or ignore it completely
  ) // be in charge of producing things that treat the context as an argument into
  // the second one should be in charge of actually building the context, and eventually passing
  // it into the dyanmic config.
  {}

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
        await bus.runEvents(context);
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
    // TODO: how can we instrument pre-context failures and events?
    // the current eventBus system assumes the existence of a NexusContext
    // AND a nexusConfig instance.
    // maybe some events should be emitted before the context is created?
    // and maybe events should optionally hold the context object inside,
    // rather than relying on the context to be an argument in their respective event handlers?
    // ^^^^ THIS IS THE MOVE ^^^^
    // if an event needs its context, it should be passed in as an argument.
    // otherwise, a solo, empty, context-less event is not just okay, but preferred.
    // ~~~~
    // ~~~~
    // But then all events have to be aware of TServerContext, which is not ideal.
    // Maybe context can stay in the handler after all.

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
