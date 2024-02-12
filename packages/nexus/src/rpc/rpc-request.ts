import { RpcMethod, UnknownRpcMethod } from "@src/rpc-method-desciptor";
import type { RpcRequestPayload } from "./schemas";

export class RpcRequest<M extends string, P, R> {
  constructor(
    public readonly rpcMethod: RpcMethod<M, P, R>,
    public readonly payload: RpcRequestPayload
  ) {}

  public getResponseId(): string | number | null {
    return this.payload.id || null;
  }
}

export type UnknownRpcRequest = RpcRequest<string, unknown, unknown>;
