import type { RpcEndpointPool } from "@src/rpc-endpoint";
import type { Chain } from "@src/chain";
import type { UnknownRpcRequest } from "./rpc-request";
import { RpcResponse } from "./rpc-response";
import { NexusConfig } from "..";
import { IEmit } from "@src/events";

export class NexusContext<TServerContext = unknown> {
  public response: RpcResponse | null;
  public readonly request: UnknownRpcRequest;
  public readonly chain: Chain;
  public readonly rpcEndpointPool: RpcEndpointPool;
  public readonly serverContext: TServerContext;
  public readonly eventBus: IEmit;
  public readonly config: NexusConfig<TServerContext>;

  constructor(args: {
    request: UnknownRpcRequest;
    chain: Chain;
    rpcEndpointPool: RpcEndpointPool;
    serverContext: TServerContext;
    eventBus: IEmit;
    config: NexusConfig<TServerContext>;
  }) {
    this.response = null;
    this.request = args.request;
    this.chain = args.chain;
    this.rpcEndpointPool = args.rpcEndpointPool;
    this.serverContext = args.serverContext;
    this.eventBus = args.eventBus;
    this.config = args.config;
  }

  public respond(response: RpcResponse): void {
    if (this.response !== null) {
      throw new Error("Response already set");
    }
    this.response = response;
  }
}
