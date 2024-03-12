import type { Chain } from "@src/chain";
import type { Emit } from "@src/events";
import type { Container } from "@src/dependency-injection";
import type { UnknownRpcRequest } from "./rpc-request";
import type { RpcResponse } from "./rpc-response";

export class NexusContext<TServerContext = unknown> {
  public response: RpcResponse | null;
  public readonly request: UnknownRpcRequest;
  public readonly chain: Chain;
  public readonly serverContext: TServerContext;
  public readonly eventBus: Emit;
  public readonly container: Container<TServerContext>;

  constructor(args: {
    request: UnknownRpcRequest;
    chain: Chain;
    serverContext: TServerContext;
    eventBus: Emit;
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
