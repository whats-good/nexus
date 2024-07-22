import type { Chain } from "@src/chain";
import type { NodeEndpointPool } from "@src/node-endpoint";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import type { RpcResponse } from "@src/rpc-response";

export class NexusRpcContext {
  public readonly chain: Chain;
  public readonly url: URL;
  public readonly nodeEndpointPool: NodeEndpointPool;
  public readonly rpcRequestPayload: RpcRequestPayloadType;
  public readonly requestId: string | number | null;
  private rpcResponse: RpcResponse | null = null;

  constructor(params: {
    chain: Chain;
    url: URL;
    nodeEndpointPool: NodeEndpointPool;
    rpcRequestPayload: RpcRequestPayloadType;
  }) {
    this.chain = params.chain;
    this.url = params.url;
    this.nodeEndpointPool = params.nodeEndpointPool;
    this.rpcRequestPayload = params.rpcRequestPayload;
    this.requestId = params.rpcRequestPayload.id || null;
  }

  public setResponse(response: RpcResponse) {
    if (this.rpcResponse) {
      throw new Error("Response already set");
    } else {
      this.rpcResponse = response;
    }
  }

  public getResponse(): RpcResponse | null {
    return this.rpcResponse;
  }
}
