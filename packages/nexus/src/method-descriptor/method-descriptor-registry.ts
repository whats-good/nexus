import { z } from "zod";
import type {
  MethodDescriptor,
  AnyMethodDescriptor,
} from "./method-descriptor";

type MethodDescriptorTuple = readonly [
  AnyMethodDescriptor,
  ...AnyMethodDescriptor[],
];

type MethodNameOf<D extends AnyMethodDescriptor> = D["methodName"];

type MethodNamesOf<T extends MethodDescriptorTuple> = MethodNameOf<T[number]>;

type MethodDescriptorMapOf<T extends MethodDescriptorTuple> = {
  [M in MethodNamesOf<T>]: T extends readonly (infer D)[]
    ? D extends MethodDescriptor<M, infer P, infer R>
      ? MethodDescriptor<M, P, R>
      : never
    : never;
};

type RpcRequestSchemasListOf<T extends MethodDescriptorTuple> = {
  [K in keyof T]: T[K]["rpcRequestSchema"];
};
type RpcRequestBodySchemaOf<T extends MethodDescriptorTuple> = z.ZodUnion<
  RpcRequestSchemasListOf<T>
>;

type SomeRpcDescriptorInTuple<T extends MethodDescriptorTuple> = T[number];

export class RpcDescriptorRegistry<T extends MethodDescriptorTuple> {
  public readonly descriptorMap: MethodDescriptorMapOf<T>;
  private readonly rpcRequestSchema: RpcRequestBodySchemaOf<T>;

  constructor(private readonly tuple: T) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Need to use the any type here since the object can't be initialized as the final desired type.
    this.descriptorMap = this.tuple.reduce((acc, cur) => {
      return {
        ...acc,
        [cur.methodName]: cur,
      };
    }, {}) as any;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Need to use the any type here since zod union type is too complex for internal inference
    this.rpcRequestSchema = z.union(
      tuple.map((descriptor) => descriptor.rpcRequestSchema) as any
    );
  }
}
