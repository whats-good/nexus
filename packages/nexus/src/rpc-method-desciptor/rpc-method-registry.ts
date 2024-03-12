import type { AnyRpcMethod, UnknownRpcMethod } from "./rpc-method";

export class RpcMethodRegistry {
  private readonly rpcMethodMap = new Map<string, UnknownRpcMethod>();

  constructor(private readonly rpcMethodList: AnyRpcMethod[]) {
    this.rpcMethodList.forEach((rpcMethod) => {
      this.rpcMethodMap.set(rpcMethod.method, rpcMethod);
    });
  }

  public get(methodName: string): UnknownRpcMethod | null {
    return this.rpcMethodMap.get(methodName) ?? null;
  }
}
