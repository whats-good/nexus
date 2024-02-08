import { NexusConfig, NexusConfigOptions } from "@src/config";
import { IntString, NexusNotFoundResponse, Route } from "@src/controller";
import { NexusEvent, NexusEventBus, NexusEventHandler } from "@src/events";
import { NexusContextHandler } from "@src/rpc";
import { NexusContextFactory } from "@src/rpc/nexus-context-factory";
import { safeAsyncNextTick } from "@src/utils";
import {
  ServerAdapter,
  ServerAdapterBaseObject,
  createServerAdapter,
} from "@whatwg-node/server";
import { z } from "zod";

class SomeEvent extends NexusEvent {
  constructor(public readonly kerem: string) {
    super();
  }
}

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

  public handle = async (
    request: Request,
    serverContext: TServerContext
  ): Promise<Response> => {
    const bus = new NexusEventBus<TServerContext>();

    bus.registerHandler(SomeEvent, async (event: SomeEvent, context) => {
      context.config.logger.info(
        `Handling event via handler 1: ${event.kerem}`
      );
    });

    bus.registerHandler(SomeEvent, async (event: SomeEvent, context) => {
      context.config.logger.info(
        `Handling event via handler 2: ${event.kerem}`
      );
    });

    bus.registerHandler(SomeEvent, async (event: SomeEvent, context) => {
      context.config.logger.info(
        `Handling event via handler 3: ${event.kerem}`
      );
    });

    bus.registerHandler(SomeEvent, async (event: SomeEvent, context) => {
      context.config.logger.info(
        `Handling event via handler 4: ${event.kerem}`
      );
    });

    bus.registerHandler(SomeEvent, async (event: SomeEvent, context) => {
      context.config.logger.info(
        `Handling event via handler 5: ${event.kerem}`
      );
    });

    const config = NexusConfig.fromOptions(this.options, {
      context: serverContext,
      request,
    });

    const chainIdParams = chainIdRoute.match(request.url);

    if (chainIdParams) {
      const nexusContextFactory = new NexusContextFactory(config);
      const result = await nexusContextFactory.from(request, chainIdParams);
      if (result.kind === "success") {
        const contextHandler = NexusContextHandler.fromConfig(config);

        bus.schedule(new SomeEvent("kerem-1"));
        bus.schedule(new SomeEvent("kerem-2"));
        bus.schedule(new SomeEvent("kerem-3"));
        bus.schedule(new SomeEvent("kerem-4"));
        bus.schedule(new SomeEvent("kerem-5"));

        const rpcResponse = await contextHandler.handle(result.context);
        safeAsyncNextTick(
          async () => {
            await bus.runEvents(result.context);
          },
          () => {}
        );
        return rpcResponse.buildResponse();
      } else {
        return result.response.buildResponse();
      }
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
