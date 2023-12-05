import {
  createServerAdapter,
  type ServerAdapterBaseObject,
} from "@whatwg-node/server";
import { RequestHandler } from "../request-handler/request-handler";
import { Config } from "../config";
import type { ConfigConstructorParams } from "../config";
import { createDefaultRegistry } from "../registry";

type EmptyServerContext = Record<string, never>;

type ServerContextConfigMap<TServerContext> = {
  [K in keyof ConfigConstructorParams]:
    | ConfigConstructorParams[K]
    | ((
        serverContext: TServerContext,
        request: Request
      ) => ConfigConstructorParams[K]);
};

export class NexusServer<TServerContext = EmptyServerContext>
  implements ServerAdapterBaseObject<TServerContext>
{
  private readonly requestHandler = new RequestHandler();
  private readonly defaultRegistry = createDefaultRegistry();

  private constructor(
    private readonly options: ServerContextConfigMap<TServerContext>
  ) {}

  private getValueOrExecute<T>(
    valueOrFunction:
      | T
      | ((serverContext: TServerContext, request: Request) => T),
    serverContext: TServerContext,
    request: Request
  ): T {
    if (typeof valueOrFunction === "function") {
      return (
        valueOrFunction as (
          serverContext: TServerContext,
          request: Request
        ) => T
      )(serverContext, request);
    }

    return valueOrFunction;
  }

  public handle = async (
    request: Request,
    serverContext: TServerContext
  ): Promise<Response> => {
    const registryParam = this.getValueOrExecute(
      this.options.registry,
      serverContext,
      request
    );

    // TODO: cleanup

    const configParams: ConfigConstructorParams = {
      registry: registryParam || this.defaultRegistry,
      chains: this.getValueOrExecute(
        this.options.chains,
        serverContext,
        request
      ),
      providers: this.getValueOrExecute(
        this.options.providers,
        serverContext,
        request
      ),
      globalAccessKey: this.getValueOrExecute(
        this.options.globalAccessKey,
        serverContext,
        request
      ),
      recoveryMode: this.getValueOrExecute(
        this.options.recoveryMode,
        serverContext,
        request
      ),
    };

    const config = new Config(configParams);

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
