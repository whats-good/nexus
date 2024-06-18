import type {
  ServerAdapter,
  ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { createServerAdapter } from "@whatwg-node/server";
import type { Logger } from "pino";
import { NexusConfig, type NexusConfigOptions } from "@src/nexus-config";
import { Controller } from "@src/controller";
import { StaticContainer } from "@src/dependency-injection";

export type NexusServerInstance<TPlatformContext = unknown> = ServerAdapter<
  TPlatformContext,
  Nexus<TPlatformContext>
>;

export class Nexus<TPlatformContext = unknown>
  implements ServerAdapterBaseObject<TPlatformContext>
{
  private readonly staticContainer: StaticContainer<TPlatformContext>;
  private readonly controller: Controller<TPlatformContext>;
  public readonly port?: number;
  public readonly logger: Logger;

  private constructor(staticContainer: StaticContainer<TPlatformContext>) {
    this.staticContainer = staticContainer;
    this.controller = new Controller(staticContainer);
    this.port = staticContainer.config.port;
    this.logger = staticContainer.logger.child({ name: this.constructor.name });
  }

  public handle = async (
    request: Request,
    ctx: TPlatformContext
  ): Promise<Response> => {
    // TODO: wrap this with a try-catch for final error handling
    return (await this.controller.handleRequest(request, ctx)).buildResponse();
  };

  public static create<TPlatformContext = unknown>(
    options: NexusConfigOptions<TPlatformContext>
  ) {
    const staticContainer = new StaticContainer({
      config: NexusConfig.init(options),
    });
    const server = new Nexus(staticContainer);

    return createServerAdapter<TPlatformContext, Nexus<TPlatformContext>>(
      server
    ) as unknown as NexusServerInstance<TPlatformContext>;
  }
}
