import type {
  AnyRpcMethodDescriptor,
  UnknownRpcMethodDescriptor,
} from "./rpc-method-descriptor";

export class RpcMethodDescriptorRegistry {
  private readonly descriptorMap: Map<string, UnknownRpcMethodDescriptor> =
    new Map();

  constructor(private readonly descriptorList: AnyRpcMethodDescriptor[]) {
    this.descriptorList.forEach((descriptor) => {
      this.descriptorMap.set(descriptor.method, descriptor);
    });
  }

  public getDescriptorByName(
    methodName: string
  ): UnknownRpcMethodDescriptor | null {
    return this.descriptorMap.get(methodName) ?? null;
  }
}
