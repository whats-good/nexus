import type {
  MethodDescriptor,
  AnyMethodDescriptor,
} from "./method-descriptor";

type MethodDescriptorTuple = readonly [
  AnyMethodDescriptor,
  ...AnyMethodDescriptor[],
];

type MethodNameOf<D extends AnyMethodDescriptor> = D["method"];

type MethodNamesOf<T extends MethodDescriptorTuple> = MethodNameOf<T[number]>;

type MethodDescriptorMapOf<T extends MethodDescriptorTuple> = {
  [M in MethodNamesOf<T>]: T extends readonly (infer D)[]
    ? D extends MethodDescriptor<M, infer P, infer R>
      ? MethodDescriptor<M, P, R>
      : never
    : never;
};

type SomeDescriptorInTuple<T extends MethodDescriptorTuple> = T[number];

export class MethodDescriptorRegistry<T extends MethodDescriptorTuple> {
  public readonly descriptorMap: MethodDescriptorMapOf<T>;

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
  ): SomeDescriptorInTuple<T> | undefined {
    return this.tuple.find((descriptor) => descriptor.method === methodName);
  }
}
