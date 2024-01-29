import type { RpcEndpointPool } from "@src/rpc-endpoint";
import type { Chain } from "@src/chain";
import type { UnknownValidRpcRequest } from "./rpc-request";

export class RpcContext {
  constructor(
    public readonly request: UnknownValidRpcRequest,
    public readonly chain: Chain,
    public readonly rpcEndpointPool: RpcEndpointPool
  ) {}
}
