import { z } from "zod";

type MethodSchema<T extends string> = z.ZodType<T, any>;
type AnyMethodSchema = MethodSchema<any>;

type ParamsSchema<T> = z.ZodType<T, any>;
type AnyParamsSchema = ParamsSchema<any>;

type ResultSchema<T> = z.ZodType<T, any>;
export type AnyResultSchema = ResultSchema<any>;

const RpcRequestIdSchema = z.union([z.number(), z.string()]);

// type RequestId = z.ZodType<typeof RpcRequestIdSchema>;

const BaseRpcRequestParams = z.array(z.unknown()).nullish();

const MinimalRpcRequestSchema = z.object({
  id: RpcRequestIdSchema.nullish().default(null),
  jsonrpc: z.string(),
  method: z.string(),
  params: BaseRpcRequestParams,
});

type RpcRequestSchema<
  M extends AnyMethodSchema,
  P extends AnyParamsSchema,
> = ReturnType<
  typeof MinimalRpcRequestSchema.extend<{
    method: M;
    params: P;
  }>
>;

const RpcResponseBase = z.object({
  id: RpcRequestIdSchema,
  jsonrpc: z.string(),
});

// const MinimalRpcErrorResponseSchema = RpcResponseBase.extend({
//   error: z.object({
//     code: z.number(),
//     message: z.string(),
//   }),
// });

const MinimalRpcSuccessResponseSchema = RpcResponseBase.extend({
  result: z.unknown(),
});

// const MinimalRpcResponseSchema = z.union([
//   MinimalRpcErrorResponseSchema,
//   MinimalRpcSuccessResponseSchema,
// ]);

// type MinimalRpcResponse = z.infer<typeof MinimalRpcResponseSchema>;
// type MinimalRpcErrorResponse = z.infer<typeof MinimalRpcErrorResponseSchema>;
// type MinimalRpcSuccessResponse = z.infer<
//   typeof MinimalRpcSuccessResponseSchema
// >;

type RpcSuccessResponseSchema<Result extends ResultSchema<any>> = ReturnType<
  typeof MinimalRpcSuccessResponseSchema.extend<{
    result: Result;
  }>
>;

export class MethodDescriptor<
  M extends string,
  P extends AnyParamsSchema,
  R extends AnyResultSchema,
> {
  public readonly rpcRequestSchema: RpcRequestSchema<z.ZodLiteral<M>, P>;
  public readonly rpcSuccessResponseSchema: RpcSuccessResponseSchema<R>;

  private constructor(
    public readonly methodName: M,
    public readonly methodSchema: z.ZodLiteral<M>,
    public readonly paramsSchema: P,
    public readonly resultSchema: R
  ) {
    this.rpcRequestSchema = MinimalRpcRequestSchema.extend({
      method: methodSchema,
      params: paramsSchema,
    });

    this.rpcSuccessResponseSchema = MinimalRpcSuccessResponseSchema.extend({
      result: resultSchema,
    });
  }

  public static init = <
    InitMN extends string,
    InitP extends [z.ZodTypeAny, ...z.ZodTypeAny[]] | [], // TODO: this means null-param methods need to be processed as empty array methods.
    InitR extends AnyResultSchema,
  >({
    name,
    params,
    result,
  }: {
    name: InitMN;
    params: InitP;
    result: InitR;
  }) => {
    return new MethodDescriptor(name, z.literal(name), z.tuple(params), result);
  };
}

type AnyMethodDescriptor = MethodDescriptor<
  any,
  AnyParamsSchema,
  AnyResultSchema
>;

// type ResultOf<MD extends AnyMethodDescriptor> = z.TypeOf<MD["resultSchema"]>;
// type SuccessResponseOf<MD extends AnyMethodDescriptor> = z.TypeOf<
//   MD["rpcSuccessResponseSchema"]
// >;
// type RpcRequestOf<MD extends AnyMethodDescriptor> = z.TypeOf<
//   MD["rpcRequestSchema"]
// >;

export type AnyMethodDescriptorTuple = [
  AnyMethodDescriptor,
  ...AnyMethodDescriptor[],
];

type MethodNamesOfMethodDescriptorTuple<T extends AnyMethodDescriptorTuple> =
  T[number]["methodName"];

export type MethodDescriptorMapOf<T extends AnyMethodDescriptorTuple> = Omit<
  {
    [MN in MethodNamesOfMethodDescriptorTuple<T>]: T extends readonly (infer MD)[]
      ? MD extends MethodDescriptor<MN, infer P, infer R>
        ? MethodDescriptor<MN, P, R>
        : never
      : never;
  },
  "__ignore"
>;

export class MethodDescriptorRegistry<T extends AnyMethodDescriptorTuple> {
  public readonly methodDescriptorMap: MethodDescriptorMapOf<T>;

  private constructor(public readonly methodDescriptorTuple: T) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Need to use the any type here since the object can't be initialized as the final desired type.
    this.methodDescriptorMap = this.methodDescriptorTuple.reduce((acc, cur) => {
      return {
        ...acc,
        [cur.methodName]: cur,
      };
    }, {}) as any;
  }

  public static init() {
    return new MethodDescriptorRegistry([
      MethodDescriptor.init({
        name: "__ignore",
        params: [],
        result: z.never(),
      }),
    ]);
  }

  public methodDescriptor<
    MN extends string,
    P extends [z.ZodTypeAny, ...z.ZodTypeAny[]] | [],
    R extends AnyResultSchema,
  >({ name, params, result }: { name: MN; params: P; result: R }) {
    const newDescriptor = MethodDescriptor.init({ name, params, result });

    return new MethodDescriptorRegistry([
      newDescriptor,
      ...this.methodDescriptorTuple,
    ]);
  }
}
