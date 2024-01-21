import type {
  RpcMethodDescriptor,
  UnknownRpcMethodDescriptor,
} from "./rpc-method-descriptor";

type RpcMethodDescriptorTuple = readonly [
  UnknownRpcMethodDescriptor,
  ...UnknownRpcMethodDescriptor[],
];

type MethodNameOf<D extends UnknownRpcMethodDescriptor> = D["method"];

type MethodNamesOf<T extends RpcMethodDescriptorTuple> = MethodNameOf<
  T[number]
>;

type RpcMethodDescriptorMapOf<T extends RpcMethodDescriptorTuple> = {
  [M in MethodNamesOf<T>]: T extends readonly (infer D)[]
    ? D extends RpcMethodDescriptor<M, infer P, infer R>
      ? RpcMethodDescriptor<M, P, R>
      : never
    : never;
};

type SomeDescriptorInTuple<T extends RpcMethodDescriptorTuple> = T[number];

export class RpcMethodRegistry<T extends RpcMethodDescriptorTuple> {
  public readonly descriptorMap: RpcMethodDescriptorMapOf<T>;

  constructor(private readonly tuple: T) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Need to use the any type here since the object can't be initialized as the final desired type.
    this.descriptorMap = this.tuple.reduce((acc, cur) => {
      return {
        ...acc,
        [cur.method]: cur,
      };
    }, {}) as any;
  }

  public getDescriptorByName(
    methodName: string
  ): SomeDescriptorInTuple<T> | null {
    return (
      this.tuple.find((descriptor) => descriptor.method === methodName) || null
    );
  }
}
