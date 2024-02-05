import type { RpcEndpointPool } from "@src/rpc-endpoint";
import type { Chain } from "@src/chain";
import type { UnknownRpcRequest } from "./rpc-request";
import { RpcResponse } from "./rpc-response";

export class RpcContext<TServerContext = unknown> {
  public response: RpcResponse | null;

  constructor(
    public readonly request: UnknownRpcRequest,
    public readonly chain: Chain,
    public readonly rpcEndpointPool: RpcEndpointPool,
    public readonly serverContext: TServerContext
  ) {
    this.response = null;
  }

  public respond(response: RpcResponse): void {
    if (this.response !== null) {
      throw new Error("Response already set");
    }
    this.response = response;
  }
}
