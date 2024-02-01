import { BaseCache, CacheHandler } from "@src/cache";
import { Chain, ChainRegistry } from "@src/chain";
import { Logger } from "@src/logger";
import { RelayFailureConfig } from "@src/rpc-endpoint";
import {
  RpcMethodDescriptorRegistry,
  RPC_METHOD_DESCRIPTOR,
  AnyRpcMethodDescriptor,
} from "@src/rpc-method-desciptor";
import {
  ServiceProvider,
  ServiceProviderRegistry,
} from "@src/service-provider";
import pino from "pino";

type ConfigOptionFnArgs<TServerContext> = {
  context: TServerContext;
  request: Request;
};
type ConfigOptionFn<TServerContext, TField> = (
  args: ConfigOptionFnArgs<TServerContext>
) => TField;
type ConfigOptionField<TServerContext, TField> =
  | TField
  | ConfigOptionFn<TServerContext, TField>;

export type NexusConfigOptions<TServerContext> = {
  cache?: BaseCache;
  chains: ConfigOptionField<TServerContext, Chain[]>; // TODO: make this a tuple
  serviceProviders: ConfigOptionField<TServerContext, ServiceProvider[]>; // TODO: make this a tuple
  rpcMethodDescriptors?: ConfigOptionField<
    TServerContext,
    AnyRpcMethodDescriptor[]
  >;
  logger?: ConfigOptionField<TServerContext, Logger>;
  relayFailureConfig?: ConfigOptionField<TServerContext, RelayFailureConfig>;
  providerKeys: Record<string, string | undefined>;
};

export class NexusConfig<TServerContext> {
  public readonly cacheHandler?: CacheHandler;
  public readonly chainRegistry: ChainRegistry;
  public readonly serviceProviderRegistry: ServiceProviderRegistry;
  public readonly rpcMethodRegistry: RpcMethodDescriptorRegistry;
  public readonly relayFailureConfig: RelayFailureConfig;
  public readonly logger: Logger;
  public readonly serverContext: TServerContext;
  public readonly providerKeys: Record<string, string | undefined>;

  constructor(args: {
    cacheHandler?: CacheHandler;
    chainRegistry: ChainRegistry;
    serviceProviderRegistry: ServiceProviderRegistry;
    rpcMethodDescriptorRegistry: RpcMethodDescriptorRegistry;
    relayFailureConfig: RelayFailureConfig;
    logger: Logger;
    serverContext: TServerContext;
    providerKeys: Record<string, string | undefined>;
  }) {
    this.chainRegistry = args.chainRegistry;
    this.serviceProviderRegistry = args.serviceProviderRegistry;
    this.rpcMethodRegistry = args.rpcMethodDescriptorRegistry;
    this.relayFailureConfig = args.relayFailureConfig;
    this.logger = args.logger;
    this.serverContext = args.serverContext;
    this.cacheHandler = args.cacheHandler;
    this.providerKeys = args.providerKeys || {};
  }

  private static getValueOrExecute<TServerContext, TField>(
    valueOrFunction: ConfigOptionField<TServerContext, TField>,
    args: ConfigOptionFnArgs<TServerContext>
  ): TField {
    if (typeof valueOrFunction === "function") {
      return (valueOrFunction as ConfigOptionFn<TServerContext, TField>)(args);
    }
    return valueOrFunction;
  }

  public static fromOptions<TServerContext>(
    options: NexusConfigOptions<TServerContext>,
    args: ConfigOptionFnArgs<TServerContext>
  ) {
    const logger =
      NexusConfig.getValueOrExecute(options.logger, args) ||
      pino({
        transport: {
          target: "pino-pretty",
        },
      });

    const chains = NexusConfig.getValueOrExecute(options.chains, args);
    const chainRegistry = new ChainRegistry({ logger });
    chainRegistry.addChains(chains);

    const serviceProviders = NexusConfig.getValueOrExecute(
      options.serviceProviders,
      args
    );
    const serviceProviderRegistry = new ServiceProviderRegistry({
      logger,
    });
    serviceProviderRegistry.addServiceProviders(serviceProviders);

    const rpcMethodDescriptors =
      NexusConfig.getValueOrExecute(options.rpcMethodDescriptors, args) ||
      Object.values(RPC_METHOD_DESCRIPTOR);
    const rpcMethodDescriptorRegistry = new RpcMethodDescriptorRegistry(
      rpcMethodDescriptors
    );

    const relayFailureConfig = NexusConfig.getValueOrExecute(
      options.relayFailureConfig,
      args
    ) || {
      kind: "cycle-requests",
      maxAttempts: 3,
    };

    const baseCache = NexusConfig.getValueOrExecute(options.cache, args);
    const cacheHandler = baseCache ? new CacheHandler(baseCache) : undefined;

    const providerKeys = NexusConfig.getValueOrExecute(
      options.providerKeys,
      args
    );

    return new NexusConfig({
      chainRegistry,
      serviceProviderRegistry,
      rpcMethodDescriptorRegistry,
      relayFailureConfig,
      logger,
      cacheHandler,
      serverContext: args.context,
      providerKeys,
    });
  }
}
