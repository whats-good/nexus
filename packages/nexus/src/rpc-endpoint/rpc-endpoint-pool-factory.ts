import type { Config } from "../config";
import type { Chain } from "../chain/chain";
import { shuffle } from "../utils";
import { RpcEndpointPool } from "./rpc-endpoint-pool";

export class RpcEndpointPoolFactory {
  constructor(private readonly config: Config) {}

  public fromChain(chain: Chain): RpcEndpointPool {
    const eligibleServiceProviders =
      this.config.serviceProviderRegistry.findManyByChain(chain);

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
