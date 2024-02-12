import { BaseCache, CacheHandler, cacheWriteOnRelaySuccess } from "@src/cache";
import { Chain, ChainRegistry } from "@src/chain";
import { Logger } from "@src/logger";
import { RelayFailureConfig } from "@src/rpc-endpoint";
import {
  RpcMethodRegistry,
  RPC_METHOD_BUILDER,
  AnyRpcMethod,
} from "@src/rpc-method-desciptor";
import { NodeProvider, NodeProviderRegistry } from "@src/node-provider";
import pino from "pino";
import { NexusMiddleware, NexusMiddlewareManager } from "@src/middleware";
import { EVENT, EventAndHandlerPair, IEmit, NexusEventBus } from "@src/events";
import { cacheMiddleware } from "@src/cache/cache-middleware";
import { cannedResponseMiddleware } from "@src/rpc/canned-response-middleware";
import { relayMiddleware } from "@src/rpc/relay-middleware";
import { requestFilterMiddleware } from "@src/rpc/request-filter-middleware";

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
  rpcMethods?: ConfigOptionField<TServerContext, AnyRpcMethod[]>;
  logger?: ConfigOptionField<TServerContext, Logger>;
  relayFailureConfig?: ConfigOptionField<TServerContext, RelayFailureConfig>;
  middlewares?: NexusMiddleware<TServerContext>[];
  eventHandlers?: EventAndHandlerPair<any, TServerContext>[];
};

export class NexusConfig<TServerContext> {
  public readonly cacheHandler?: CacheHandler<TServerContext>;
  public readonly chainRegistry: ChainRegistry;
  public readonly nodeProviderRegistry: NodeProviderRegistry;
  public readonly rpcMethodRegistry: RpcMethodRegistry;
  public readonly relayFailureConfig: RelayFailureConfig;
  public readonly logger: Logger;
  public readonly serverContext: TServerContext;
  public readonly eventBus: IEmit;
  public readonly middlewareManager: NexusMiddlewareManager<TServerContext>;

  constructor(args: {
    cacheHandler?: CacheHandler<TServerContext>;
    chainRegistry: ChainRegistry;
    nodeProviderRegistry: NodeProviderRegistry;
    rpcMethodRegistry: RpcMethodRegistry;
    relayFailureConfig: RelayFailureConfig;
    logger: Logger;
    serverContext: TServerContext;
    eventBus: NexusEventBus<TServerContext>;
    middlewareManager: NexusMiddlewareManager<TServerContext>;
  }) {
    this.chainRegistry = args.chainRegistry;
    this.nodeProviderRegistry = args.nodeProviderRegistry;
    this.rpcMethodRegistry = args.rpcMethodRegistry;
    this.relayFailureConfig = args.relayFailureConfig;
    this.logger = args.logger;
    this.serverContext = args.serverContext;
    this.cacheHandler = args.cacheHandler;
    this.eventBus = args.eventBus;
    this.middlewareManager = args.middlewareManager;
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

    const rpcMethods =
      NexusConfig.getValueOrExecute(options.rpcMethods, args) ||
      Object.values(RPC_METHOD_BUILDER).map((builder) => builder.build());
    const rpcMethodRegistry = new RpcMethodRegistry(rpcMethods);

    const relayFailureConfig = NexusConfig.getValueOrExecute(
      options.relayFailureConfig,
      args
    ) || {
      kind: "cycle-requests",
      maxAttempts: 3,
    };

    const baseCache = NexusConfig.getValueOrExecute(options.cache, args);
    const cacheHandler = baseCache
      ? new CacheHandler<TServerContext>(baseCache, logger)
      : undefined;

    const eventHandlers: EventAndHandlerPair<any, TServerContext>[] = [
      ...(options.eventHandlers || []),
      {
        event: EVENT.RelaySuccessResponseEvent,
        handler: cacheWriteOnRelaySuccess,
      },
    ];

    const eventBus = new NexusEventBus(eventHandlers, logger);

    const middlewares = [
      ...(options.middlewares || []),
      requestFilterMiddleware,
      cannedResponseMiddleware,
      cacheMiddleware,
      relayMiddleware,
    ];

    const middlewareManager = new NexusMiddlewareManager(middlewares);

    return new NexusConfig({
      chainRegistry,
      nodeProviderRegistry,
      rpcMethodRegistry,
      relayFailureConfig,
      logger,
      cacheHandler,
      serverContext: args.context,
      eventBus,
      middlewareManager,
    });
  }
}
