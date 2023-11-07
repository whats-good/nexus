import type { Config } from "../config";
import { defaultServiceProviderRegistry } from "../setup/data";
import type { ChainRegistry } from "../chain/chain-registry";
import type { Chain } from "../chain/chain";
import type { ServiceProviderRegistry } from "../service-provider/service-provider-registry";
import { shuffle } from "../utils";
import { RpcEndpointPool } from "./rpc-endpoint-pool";

export class RpcEndpointPoolFactory {
  private readonly config: Config;
  private readonly serviceProviderRegistry: ServiceProviderRegistry;
  constructor(params: {
    config: Config;
    chainRegistry?: ChainRegistry;
    serviceProviderRegistry?: ServiceProviderRegistry;
  }) {
    this.config = params.config;
    this.serviceProviderRegistry =
      params.serviceProviderRegistry ?? defaultServiceProviderRegistry;
  }

  public fromChain(chain: Chain): RpcEndpointPool {
    const eligibleServiceProviders =
      this.serviceProviderRegistry.findManyByChain(chain);

    const configuredServiceProviders = eligibleServiceProviders.filter((sp) =>
      sp.isConfiguredForChain(chain, this.config)
    );

    return new RpcEndpointPool({
      chain,
      eligibleServiceProviders,
      configuredServiceProviders: shuffle(configuredServiceProviders),
      config: this.config,
    });
  }
}
