import type { BaseCache } from "@src/cache";
import type { Chain } from "@src/chain";
import type { Logger } from "@src/logger";
import type { RelayFailureConfig } from "@src/rpc-endpoint";
import type { AnyRpcMethod } from "@src/rpc-method-desciptor";
import type { NodeProvider } from "@src/node-provider";
import type { NexusMiddleware } from "@src/middleware";
import type { EventAndHandlerPair } from "@src/events";
import type { DeferAsyncFn } from "@src/utils";

export interface ConfigOptionFnArgs<TServerContext> {
  context: TServerContext;
  request: Request;
}
export type ConfigOptionFn<TServerContext, TField> = (
  args: ConfigOptionFnArgs<TServerContext>
) => TField;
export type ConfigOptionField<TServerContext, TField> =
  | TField
  | ConfigOptionFn<TServerContext, TField>;

export interface NexusConfigOptions<TServerContext> {
  cache?: BaseCache;
  chains: ConfigOptionField<TServerContext, Chain[]>; // TODO: make this a tuple
  nodeProviders: ConfigOptionField<TServerContext, NodeProvider[]>; // TODO: make this a tuple
  rpcMethods?: ConfigOptionField<TServerContext, AnyRpcMethod[]>;
  logger?: ConfigOptionField<TServerContext, Logger>;
  relayFailureConfig?: ConfigOptionField<TServerContext, RelayFailureConfig>;
  middlewares?: ConfigOptionField<
    TServerContext,
    NexusMiddleware<TServerContext>[]
  >;
  eventHandlers?: ConfigOptionField<
    TServerContext,
    EventAndHandlerPair<any, TServerContext>[]
  >;
  port?: number;

  // use this to configure async work that can be completed after the response is sent.
  // warning: this does not guarantee that the work will start before the response is sent.
  // some runtimes, like Cloudflare Workers,
  deferAsync?: ConfigOptionFn<TServerContext, DeferAsyncFn>;
}
