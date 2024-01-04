import { z } from "zod";
import type { BigNumber } from "@ethersproject/bignumber";
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

type CacheConfigReadFn<T, P> = (params: {
  chain: Chain;
  params: P;
  highestKnownBlockNumber: BigNumber;
}) => T;
type CacheConfigReadField<T, P> = T | CacheConfigReadFn<T, P>;

interface CacheConfig<P> {
  enabled: CacheConfigReadField<boolean, P>;
  paramsKeySuffix: CacheConfigReadField<string, P> | null;

  // TODO: ttl might actually benefit from the result object as well as the params object.
  // i.e it we could create a CacheConfigWriteField<T, P, R> type that would allow us to
  // write a ttl based on the params AND the result.
  ttl: CacheConfigReadField<number, P>;
}

type CannedResponseFn<P, S> = (params: { chain: Chain; params: P }) => S;

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

  public readonly methodName: M;
  public readonly methodSchema: z.ZodLiteral<M>;
  public readonly paramsSchema: P;
  public readonly successValueSchema: S;
  public cacheConfig?: CacheConfig<z.infer<P>>;
  public cannedResponse?: CannedResponseFn<z.infer<P>, z.infer<S>>;

  constructor({
    methodName,
    methodSchema,
    paramsSchema,
    successValueSchema,
    cacheConfig,
    cannedResponse,
  }: {
    methodName: M;
    methodSchema: z.ZodLiteral<M>;
    paramsSchema: P;
    successValueSchema: S;
    cacheConfig?: CacheConfig<z.infer<P>>;
    cannedResponse?: CannedResponseFn<z.infer<P>, z.infer<S>>;
  }) {
    this.methodName = methodName;
    this.methodSchema = methodSchema;
    this.paramsSchema = paramsSchema;
    this.successValueSchema = successValueSchema;
    this.cacheConfig = cacheConfig;
    this.cannedResponse = cannedResponse;

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

  public clone() {
    return new MethodDescriptor({
      methodName: this.methodName,
      methodSchema: this.methodSchema,
      paramsSchema: this.paramsSchema,
      successValueSchema: this.successValueSchema,
      cacheConfig: this.cacheConfig,
      cannedResponse: this.cannedResponse,
    });
  }

  public setCacheConfig(config: MethodDescriptor<M, P, S>["cacheConfig"]) {
    this.cacheConfig = config;

    return this;
  }

  public setCannedResponse(
    cannedResponse: MethodDescriptor<M, P, S>["cannedResponse"]
  ) {
    this.cannedResponse = cannedResponse;

    // TODO: is returning `this` confusing, since this is a mutating method?

    return this;
  }

  public static init = <
    InitMN extends string,
    InitP extends AnyParamsSchema,
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
    return new MethodDescriptor({
      methodName: name,
      methodSchema: z.literal(name),
      paramsSchema: params,
      successValueSchema: result,
    });
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
