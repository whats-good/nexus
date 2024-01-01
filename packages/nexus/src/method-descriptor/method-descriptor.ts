import { z } from "zod";
import type { Chain } from "@src/chain";
// import type { JsonRPCRequest } from "@src/rpc-endpoint/json-rpc-types";

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

type CacheConfigReadFn<T, P> = (params: { chain: Chain; params: P }) => T;
// TODO: pass the largest known block number in here.
// and use it to determine the ttl of some methods. for example,
// eth_getBlockByNumber can be cached for infinity if the largest known block number is X blocks ahead of the requested block number.
type CacheConfigReadField<T, P> = T | CacheConfigReadFn<T, P>;

interface CacheConfig<P> {
  enabled: CacheConfigReadField<boolean, P>;
  paramsKeySuffix: CacheConfigReadField<string, P> | null;

  // TODO: ttl might actually benefit from the result object as well as the params object.
  // i.e it we could create a CacheConfigWriteField<T, P, R> type that would allow us to
  // write a ttl based on the params AND the result.
  ttl: CacheConfigReadField<number, P>;
}

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

  public cacheConfig?: CacheConfig<z.infer<P>>;

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

  public cache(config: CacheConfig<z.infer<P>>) {
    this.cacheConfig = config;

    return this;
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
