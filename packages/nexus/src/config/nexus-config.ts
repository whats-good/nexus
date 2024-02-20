import { BaseCache } from "@src/cache";
import { Chain } from "@src/chain";
import { Logger } from "@src/logger";
import { RelayFailureConfig } from "@src/rpc-endpoint";
import { AnyRpcMethod } from "@src/rpc-method-desciptor";
import { NodeProvider } from "@src/node-provider";
import { NexusMiddleware } from "@src/middleware";
import { EventAndHandlerPair } from "@src/events";

export type ConfigOptionFnArgs<TServerContext> = {
  context: TServerContext;
  request: Request;
};
export type ConfigOptionFn<TServerContext, TField> = (
  args: ConfigOptionFnArgs<TServerContext>
) => TField;
export type ConfigOptionField<TServerContext, TField> =
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
