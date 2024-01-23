import type { RpcEndpointPool } from "@src/rpc-endpoint";
import type { Chain } from "@src/chain";
import type { RpcRequest } from "./rpc-request";

export class NexusContext {
  constructor(
    public readonly request: RpcRequest,
    public readonly chain: Chain,
    public readonly rpcEndpointPool: RpcEndpointPool
  ) {}
}
