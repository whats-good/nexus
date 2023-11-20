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

interface NexusConstructorParams extends ConfigConstructorParams {
  chainRegistry?: ChainRegistry;
  serviceProviderRegistry?: ServiceProviderRegistry;
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

  public static createServer(params: NexusConstructorParams = {}) {
    // TODO: add process.env for node adapters
    return createServerAdapter(
      (request: Request, env: Record<string, string>) => {
        const nexus = new Nexus({
          env: {
            ...params.env,
            ...env,
          },
          providers: params.providers,
        });
        const requestHandler = new RequestHandler(nexus, request);

        return requestHandler.handle();
      }
    );
  }
}