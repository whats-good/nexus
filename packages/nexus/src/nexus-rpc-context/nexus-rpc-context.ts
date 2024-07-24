import type { Chain } from "@src/chain";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import type { RpcResponse } from "@src/rpc-response";

export class NexusRpcContext {
  public readonly chain: Chain;
  public readonly url: URL;
  public readonly request: RpcRequestPayloadType;
  private response: RpcResponse | null = null;

  constructor(params: {
    chain: Chain;
    url: URL;
    rpcRequestPayload: RpcRequestPayloadType;
  }) {
    this.chain = params.chain;
    this.url = params.url;
    this.request = params.rpcRequestPayload;
  }

  public setResponse(response: RpcResponse) {
    if (this.response) {
      throw new Error("Response already set");
    } else {
      this.response = response;
    }
  }

  public getResponse(): RpcResponse | null {
    return this.response;
  }
}
