import { ChainRegistry } from "@src/chain";
import { RelayFailureConfig } from "@src/rpc-endpoint";
import { RpcMethodDescriptorRegistry } from "@src/rpc-method-desciptor";
import { ServiceProviderRegistry } from "@src/service-provider";

export class NexusConfig {
  constructor(
    public readonly chainRegistry: ChainRegistry,
    public readonly serviceProviderRegistry: ServiceProviderRegistry,
    public readonly methodRegistry: RpcMethodDescriptorRegistry,
    public readonly relayFailureConfig: RelayFailureConfig
  ) {}
}
