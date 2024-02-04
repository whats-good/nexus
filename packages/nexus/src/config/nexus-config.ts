import { BaseCache, CacheHandler } from "@src/cache";
import { Chain, ChainRegistry } from "@src/chain";
import { Logger } from "@src/logger";
import { RelayFailureConfig } from "@src/rpc-endpoint";
import {
  RpcMethodDescriptorRegistry,
  RPC_METHOD_DESCRIPTOR,
  AnyRpcMethodDescriptor,
} from "@src/rpc-method-desciptor";
import { NodeProvider, NodeProviderRegistry } from "@src/node-provider";
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
  nodeProviders: ConfigOptionField<TServerContext, NodeProvider[]>; // TODO: make this a tuple
  rpcMethodDescriptors?: ConfigOptionField<
    TServerContext,
    AnyRpcMethodDescriptor[]
  >;
  logger?: ConfigOptionField<TServerContext, Logger>;
  relayFailureConfig?: ConfigOptionField<TServerContext, RelayFailureConfig>;
};

export class NexusConfig<TServerContext> {
  public readonly cacheHandler?: CacheHandler;
  public readonly chainRegistry: ChainRegistry;
  public readonly nodeProviderRegistry: NodeProviderRegistry;
  public readonly rpcMethodRegistry: RpcMethodDescriptorRegistry;
  public readonly relayFailureConfig: RelayFailureConfig;
  public readonly logger: Logger;
  public readonly serverContext: TServerContext;

  constructor(args: {
    cacheHandler?: CacheHandler;
    chainRegistry: ChainRegistry;
    nodeProviderRegistry: NodeProviderRegistry;
    rpcMethodDescriptorRegistry: RpcMethodDescriptorRegistry;
    relayFailureConfig: RelayFailureConfig;
    logger: Logger;
    serverContext: TServerContext;
  }) {
    this.chainRegistry = args.chainRegistry;
    this.nodeProviderRegistry = args.nodeProviderRegistry;
    this.rpcMethodRegistry = args.rpcMethodDescriptorRegistry;
    this.relayFailureConfig = args.relayFailureConfig;
    this.logger = args.logger;
    this.serverContext = args.serverContext;
    this.cacheHandler = args.cacheHandler;
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

    const nodeProviders = NexusConfig.getValueOrExecute(
      options.nodeProviders,
      args
    );

    if (nodeProviders.length === 0) {
      throw new Error("At least one node provider is required");
    }
    const nodeProviderRegistry = new NodeProviderRegistry({
      logger,
    });
    nodeProviderRegistry.addNodeProviders(nodeProviders);

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

    return new NexusConfig({
      chainRegistry,
      nodeProviderRegistry,
      rpcMethodDescriptorRegistry,
      relayFailureConfig,
      logger,
      cacheHandler,
      serverContext: args.context,
    });
  }
}
