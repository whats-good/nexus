import { createServerAdapter } from "@whatwg-node/server";
import { RequestHandler } from "../request-handler/request-handler";
import type { ChainRegistry } from "../chain/chain-registry";
import { Config } from "../config";
import type { ConfigConstructorParams } from "../config";
import { RpcEndpointPoolFactory } from "../rpc-endpoint/rpc-endpoint-pool-factory";
import type { ServiceProviderRegistry } from "../service-provider/service-provider-registry";
import {
  defaultChainRegistry,
  defaultServiceProviderRegistry,
} from "../setup/data";

type ServerContext<T = any> = Record<string, T>;
type EmptyServerContext = Record<string, never>;

interface NexusConstructorParams extends ConfigConstructorParams {
  chainRegistry?: ChainRegistry;
  serviceProviderRegistry?: ServiceProviderRegistry;
}

type ServerContextConfigMap<
  TServerContext extends ServerContext = EmptyServerContext,
> = {
  [K in keyof ConfigConstructorParams]:
    | ((ctx: TServerContext) => ConfigConstructorParams[K])
    // TODO: make this promisable
    | ConfigConstructorParams[K];
};

export function createNexus<
  TServerContext extends ServerContext = EmptyServerContext,
>(options: ServerContextConfigMap<TServerContext>) {
  const requestHandler = new RequestHandler();

  // TODO: add process.env for node adapters
  return createServerAdapter<TServerContext>(
    (request: Request, serverContext: TServerContext) => {
      const nexusParams = Object.fromEntries(
        Object.entries(options).map(([key, value]) => [
          key,
          typeof value === "function" ? value(serverContext) : value,
        ])
      );
      const nexus = new Nexus(nexusParams);

      return requestHandler.handle(nexus, request);
    }
  );
}

export class Nexus {
  public readonly config: Config;
  public readonly serviceProviderRegistry: ServiceProviderRegistry;
  public readonly chainRegistry: ChainRegistry;
  public readonly rpcEndpointPoolFactory: RpcEndpointPoolFactory;

  constructor(params: NexusConstructorParams = {}) {
    this.config = new Config(params);
    this.chainRegistry = params.chainRegistry ?? defaultChainRegistry;
    this.serviceProviderRegistry =
      params.serviceProviderRegistry ?? defaultServiceProviderRegistry;
    this.rpcEndpointPoolFactory = new RpcEndpointPoolFactory({
      chainRegistry: this.chainRegistry,
      config: this.config,
      serviceProviderRegistry: this.serviceProviderRegistry,
    });
  }
}
