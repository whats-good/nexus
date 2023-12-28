import { z } from "zod";

type MethodSchema<T extends string> = z.ZodType<T, any>;
type AnyMethodSchema = MethodSchema<any>;

type ParamsSchema<T> = z.ZodType<T, any>;
type AnyParamsSchema = ParamsSchema<any>;

type SuccessValueSchema<T> = z.ZodType<T, any>;
export type AnySuccessValueSchema = SuccessValueSchema<any>;

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

const MinimalRpcErrorResponseSchema = RpcResponseBase.extend({
  error: z.object({
    code: z.number(),
    message: z.string(),
  }),
});

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

type RpcSuccessResponseSchema<Result extends SuccessValueSchema<any>> =
  ReturnType<
    typeof MinimalRpcSuccessResponseSchema.extend<{
      result: Result;
    }>
  >;

export class MethodDescriptor<
  M extends string,
  P extends AnyParamsSchema,
  S extends AnySuccessValueSchema,
> {
  // schema for the entire rpc request
  public readonly rpcRequestSchema: RpcRequestSchema<z.ZodLiteral<M>, P>;

  // schema for the success response
  public readonly rpcSuccessResponseSchema: RpcSuccessResponseSchema<S>;

  // schema for the entire rpc response (success or error)
  public readonly rpcResponseSchema: z.ZodUnion<
    [
      MethodDescriptor<M, P, S>["rpcSuccessResponseSchema"],
      typeof MinimalRpcErrorResponseSchema,
    ]
  >;

  private constructor(
    public readonly methodName: M,
    public readonly methodSchema: z.ZodLiteral<M>,
    public readonly paramsSchema: P,
    public readonly successValueSchema: S
  ) {
    this.rpcRequestSchema = MinimalRpcRequestSchema.extend({
      method: methodSchema,
      params: paramsSchema,
    });

    this.rpcSuccessResponseSchema = MinimalRpcSuccessResponseSchema.extend({
      result: successValueSchema,
    });

    this.rpcResponseSchema = z.union([
      this.rpcSuccessResponseSchema,
      MinimalRpcErrorResponseSchema,
    ]);
  }

  public static init = <
    InitMN extends string,
    InitP extends [z.ZodTypeAny, ...z.ZodTypeAny[]] | [], // TODO: this means null-param methods need to be processed as empty array methods.
    InitR extends AnySuccessValueSchema,
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

export type AnyMethodDescriptor = MethodDescriptor<
  any,
  AnyParamsSchema,
  AnySuccessValueSchema
>;

export type MethodNameOf<MD extends AnyMethodDescriptor> = MD["methodName"];
export type SuccessResponseOf<MD extends AnyMethodDescriptor> = z.TypeOf<
  MD["rpcSuccessResponseSchema"]
>;
export type ResponseOf<MD extends AnyMethodDescriptor> = z.TypeOf<
  MD["rpcResponseSchema"]
>;
export type RequestOf<MD extends AnyMethodDescriptor> = z.TypeOf<
  MD["rpcRequestSchema"]
>;
// export type RequestParamsOf<MD extends AnyMethodDescriptor> = z.TypeOf<
//   MD["paramsSchema"]
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
    R extends AnySuccessValueSchema,
  >({ name, params, result }: { name: MN; params: P; result: R }) {
    const newDescriptor = MethodDescriptor.init({ name, params, result });

    return new MethodDescriptorRegistry([
      newDescriptor,
      ...this.methodDescriptorTuple,
    ]);
  }

  public getMethodDescriptor<
    MN extends MethodNamesOf<MethodDescriptorRegistry<T>>,
  >(name: MN): this["methodDescriptorMap"][MN] {
    return this.methodDescriptorMap[name];
  }
}

export type MethodNamesOf<R extends MethodDescriptorRegistry<any>> =
  keyof R["methodDescriptorMap"];
