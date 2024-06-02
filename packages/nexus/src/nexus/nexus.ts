import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import { NexusConfig, type NexusConfigOptions } from "@src/nexus-config";
import { Controller } from "@src/controller";
import { StaticContainer } from "@src/dependency-injection";

export type NexusServerInstance = ServerAdapter<unknown, Nexus>;

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

  public handle = async (
    request: Request,
    serverContext: TServerContext
  ): Promise<Response> => {
    return (
      await this.controller.handleRequest(request, serverContext)
    ).buildResponse();
  };

  public static create(options: NexusConfigOptions) {
    const staticContainer = new StaticContainer({
      config: NexusConfig.init(options),
    });
    const server = new Nexus(staticContainer);

    return createServerAdapter<unknown, Nexus>(
      server
    ) as unknown as NexusServerInstance;
  }
}
