import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import { NexusConfig, type NexusConfigOptions } from "@src/nexus-config";
import { Controller } from "@src/controller";
import { StaticContainer } from "@src/dependency-injection";

export type NexusServerInstance<TServerContext> = ServerAdapter<
  TServerContext,
  Nexus<TServerContext>
>;

export class Nexus<TServerContext = unknown>
  implements ServerAdapterBaseObject<TServerContext>
{
  private readonly staticContainer: StaticContainer;
  private readonly controller: Controller;
  public readonly port?: number;

  private constructor(staticContainer: StaticContainer) {
    this.staticContainer = staticContainer;
    this.controller = new Controller(staticContainer);
    this.port = staticContainer.config.port;
  }
  public async handle(
    request: Request,
    ctx: TServerContext
  ): Promise<Response> {
    // TODO: wrap this with a try-catch for final error handling
    return (await this.controller.handleRequest(request, ctx)).buildResponse();
  }

  public static create<TServerContext = unknown>(
    options: NexusConfigOptions<TServerContext>
  ) {
    const staticContainer = new StaticContainer({
      config: NexusConfig.init(options),
    });
    const server = new Nexus(staticContainer);

    return createServerAdapter<TServerContext, Nexus<TServerContext>>(
      server
    ) as unknown as NexusServerInstance<TServerContext>;
  }
}
