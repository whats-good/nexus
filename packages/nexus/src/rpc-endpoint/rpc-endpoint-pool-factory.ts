import type { RpcRequestCache } from "@src/cache";
import type { Config } from "../config";
import type { Chain } from "../chain/chain";
import { shuffle } from "../utils";
import { RpcEndpointPool } from "./rpc-endpoint-pool";

// TODO: use dependency injection to handle singleton instances

export class RpcEndpointPoolFactory {
  constructor(
    private readonly config: Config,
    private readonly rpcRequestCache: RpcRequestCache
  ) {}

  public fromChain(chain: Chain): RpcEndpointPool {
    const eligibleServiceProviders =
      this.config.registry.getServiceProvidersSupportingChain(chain);

    const configuredServiceProviders = eligibleServiceProviders.filter((sp) =>
      sp.isConfiguredForChain(chain, this.config)
    );

    return new RpcEndpointPool({
      chain,
      eligibleServiceProviders,
      configuredServiceProviders: shuffle(configuredServiceProviders),
      config: this.config,
      rpcRequestCache: this.rpcRequestCache,
    });
  }
}
