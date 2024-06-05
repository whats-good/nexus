import type { Chain } from "@src/chain";
import type { NodeEndpointPool } from "@src/node-endpoint";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import type { StaticContainer } from "./static-container";

export class NexusRpcContext<TPlatformContext = unknown> {
  public readonly parent: StaticContainer;
  public readonly platformContext: TPlatformContext;
  public readonly chain: Chain;
  public readonly nodeEndpointPool: NodeEndpointPool;
  public readonly rpcRequestPayload: RpcRequestPayloadType;
  public readonly requestId: string | number | null;

  constructor(params: {
    parent: StaticContainer;
    platformContext: TPlatformContext;
    chain: Chain;
    nodeEndpointPool: NodeEndpointPool;
    rpcRequestPayload: RpcRequestPayloadType;
  }) {
    this.parent = params.parent;
    this.platformContext = params.platformContext;
    this.chain = params.chain;
    this.nodeEndpointPool = params.nodeEndpointPool;
    this.rpcRequestPayload = params.rpcRequestPayload;
    this.requestId = params.rpcRequestPayload.id || null;
  }
}
