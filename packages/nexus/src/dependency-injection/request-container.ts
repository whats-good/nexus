import type { Chain } from "@src/chain";
import type { NodeEndpointPool } from "@src/node-endpoint";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import type { StaticContainer } from "./static-container";

export class RequestContainer<TServerContext = unknown> {
  public readonly parent: StaticContainer;
  public readonly serverContext: TServerContext;
  public readonly chain: Chain;
  public readonly nodeEndpointPool: NodeEndpointPool;
  public readonly rpcRequestPayload: RpcRequestPayloadType;
  public readonly requestId: string | number | null;

  constructor(params: {
    parent: StaticContainer;
    serverContext: TServerContext;
    chain: Chain;
    nodeEndpointPool: NodeEndpointPool;
    rpcRequestPayload: RpcRequestPayloadType;
  }) {
    this.parent = params.parent;
    this.serverContext = params.serverContext;
    this.chain = params.chain;
    this.nodeEndpointPool = params.nodeEndpointPool;
    this.rpcRequestPayload = params.rpcRequestPayload;
    this.requestId = params.rpcRequestPayload.id || null;
  }
}
