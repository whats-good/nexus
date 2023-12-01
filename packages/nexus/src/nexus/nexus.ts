import {
  createServerAdapter,
  type ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { RequestHandler } from "../request-handler/request-handler";
import { Config } from "../config";
import type { ConfigConstructorParams } from "../config";
import { createDefaultRegistry } from "../registry";

type EmptyServerContext = Record<string, never>;

type ServerContextConfigMap<TServerContext = EmptyServerContext> = {
  [K in keyof ConfigConstructorParams]:
    | ((ctx: TServerContext, request: Request) => ConfigConstructorParams[K])
    // TODO: make this promisable
    | ConfigConstructorParams[K];
};

export class NexusServer<TServerContext = EmptyServerContext>
  implements ServerAdapterBaseObject<TServerContext>
{
  private readonly requestHandler = new RequestHandler();
  private readonly defaultRegistry = createDefaultRegistry();

  private constructor(
    private readonly options: ServerContextConfigMap<TServerContext>
  ) {}

  public handle = async (
    request: Request,
    serverContext: TServerContext
  ): Promise<Response> => {
    const configParams = Object.fromEntries(
      Object.entries(this.options).map(([key, value]) => [
        key,
        typeof value === "function" ? value(serverContext, request) : value,
      ])
    );

    if (!configParams.registry) {
      configParams.registry = this.defaultRegistry;
    }

    const config = new Config(configParams as ConfigConstructorParams);

    return this.requestHandler.handle(config, request);
  };

  public static create<TServerContext = EmptyServerContext>(
    options: ServerContextConfigMap<TServerContext>
  ) {
    const server = new NexusServer(options);

    return createServerAdapter<TServerContext, NexusServer<TServerContext>>(
      server
    );
  }
}
