import {
  CacheHandler,
  cacheWriteOnRelaySuccess,
  cacheMiddleware,
} from "@src/cache";
import { ChainRegistry } from "@src/chain";
import { IEmit, NexusEventBus, EventAndHandlerPair, EVENT } from "@src/events";
import { NexusMiddlewareManager } from "@src/middleware";
import { NodeProviderRegistry } from "@src/node-provider";
import { RelayFailureConfig } from "@src/rpc-endpoint";
import {
  RPC_METHOD_BUILDER,
  RpcMethodRegistry,
} from "@src/rpc-method-desciptor";
import { cannedResponseMiddleware } from "@src/rpc/canned-response-middleware";
import { relayMiddleware } from "@src/rpc/relay-middleware";
import { requestFilterMiddleware } from "@src/rpc/request-filter-middleware";
import { Logger } from "@src/logger";
import { NexusConfigOptions } from "@src/config";
import {
  ConfigOptionField,
  ConfigOptionFn,
  ConfigOptionFnArgs,
} from "@src/config";
import pino from "pino";

export class Container<TServerContext = unknown> {
  public readonly cacheHandler?: CacheHandler<TServerContext>;
  public readonly chainRegistry: ChainRegistry;
  public readonly nodeProviderRegistry: NodeProviderRegistry;
  public readonly rpcMethodRegistry: RpcMethodRegistry;
  public readonly relayFailureConfig: RelayFailureConfig;
  public readonly logger: Logger;
  public readonly serverContext: TServerContext;
  public readonly eventBus: IEmit;
  public readonly middlewareManager: NexusMiddlewareManager<TServerContext>;
  public readonly request: Request;

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
    request: Request;
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
    this.request = args.request;
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

  public static fromOptionsAndRequest<TServerContext>(
    options: NexusConfigOptions<TServerContext>,
    args: ConfigOptionFnArgs<TServerContext>
  ) {
    const logger =
      Container.getValueOrExecute(options.logger, args) ||
      pino({
        transport: {
          target: "pino-pretty",
        },
      });

    const chains = Container.getValueOrExecute(options.chains, args);
    const chainRegistry = new ChainRegistry({ logger });
    chainRegistry.addChains(chains);

    const nodeProviders = Container.getValueOrExecute(
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
      Container.getValueOrExecute(options.rpcMethods, args) ||
      Object.values(RPC_METHOD_BUILDER).map((builder) => builder.build());
    const rpcMethodRegistry = new RpcMethodRegistry(rpcMethods);

    const relayFailureConfig = Container.getValueOrExecute(
      options.relayFailureConfig,
      args
    ) || {
      kind: "cycle-requests",
      maxAttempts: 3,
    };

    const baseCache = Container.getValueOrExecute(options.cache, args);
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

    return new Container({
      chainRegistry,
      nodeProviderRegistry,
      rpcMethodRegistry,
      relayFailureConfig,
      logger,
      cacheHandler,
      serverContext: args.context,
      eventBus,
      middlewareManager,
      request: args.request,
    });
  }
}
