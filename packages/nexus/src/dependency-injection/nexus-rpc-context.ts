import type { Chain } from "@src/chain";
import type { NodeEndpointPool } from "@src/node-endpoint";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import { EventBus } from "@src/events";
import type { RpcResponse } from "@src/rpc-response";
import type { StaticContainer } from "./static-container";

export class NexusRpcContext<TPlatformContext = unknown> {
  public readonly container: StaticContainer<TPlatformContext>;
  public readonly platformContext: TPlatformContext;
  public readonly chain: Chain;
  public readonly nodeEndpointPool: NodeEndpointPool;
  public readonly rpcRequestPayload: RpcRequestPayloadType;
  public readonly requestId: string | number | null;
  public readonly eventBus: EventBus<TPlatformContext>;
  private rpcResponse: RpcResponse | null = null;

  constructor(params: {
    container: StaticContainer<TPlatformContext>;
    platformContext: TPlatformContext;
    chain: Chain;
    nodeEndpointPool: NodeEndpointPool;
    rpcRequestPayload: RpcRequestPayloadType;
  }) {
    this.container = params.container;
    this.platformContext = params.platformContext;
    this.chain = params.chain;
    this.nodeEndpointPool = params.nodeEndpointPool;
    this.rpcRequestPayload = params.rpcRequestPayload;
    this.requestId = params.rpcRequestPayload.id || null;
    this.eventBus = new EventBus({
      ctx: this,
      handlers: this.container.config.eventHandlers,
    });
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
