import type { Chain } from "@src/chain";
import type { UnknownRpcRequest } from "./rpc-request";
import { RpcResponse } from "./rpc-response";
import { IEmit } from "@src/events";
import { Container } from "@src/dependency-injection";

export class NexusContext<TServerContext = unknown> {
  public response: RpcResponse | null;
  public readonly request: UnknownRpcRequest;
  public readonly chain: Chain;
  public readonly serverContext: TServerContext;
  public readonly eventBus: IEmit;
  public readonly container: Container<TServerContext>;

  constructor(args: {
    request: UnknownRpcRequest;
    chain: Chain;
    serverContext: TServerContext;
    eventBus: IEmit;
    container: Container<TServerContext>;
  }) {
    this.response = null;
    this.request = args.request;
    this.chain = args.chain;
    this.serverContext = args.serverContext;
    this.eventBus = args.eventBus;
    this.container = args.container;
  }

  public respond(response: RpcResponse): void {
    if (this.response !== null) {
      throw new Error("Response already set");
    }
    this.response = response;
  }
}
