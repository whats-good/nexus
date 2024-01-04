import { z } from "zod";
import type { BigNumber } from "@ethersproject/bignumber";
import type { Chain } from "@src/chain";

type MethodSchema<T extends string> = z.ZodType<T, any>;
type AnyMethodSchema = MethodSchema<any>;

type ParamsSchema<T> = z.ZodType<T, any>;
type AnyParamsSchema = ParamsSchema<any>;

type ResultSchema<T> = z.ZodType<T, any>;
export type AnyResultSchema = ResultSchema<any>;

const RpcRequestIdSchema = z.union([z.number(), z.string()]);

const MinimalRpcRequestSchema = z.object({
  id: RpcRequestIdSchema.nullish(),
  jsonrpc: z.string(),
  method: z.string(),
  params: z.array(z.unknown()).nullish(),
});

type RequestSchema<
  M extends AnyMethodSchema,
  P extends AnyParamsSchema,
> = ReturnType<
  typeof MinimalRpcRequestSchema.extend<{
    method: M;
    params: P;
  }>
>;

const RpcResponseBaseSchema = z.object({
  id: RpcRequestIdSchema.nullish(),
  jsonrpc: z.string(),
});

const ErrorResponseSchema = RpcResponseBaseSchema.extend({
  error: z.object({
    code: z.number(),
    message: z.string(),
  }),
});

type ResultResponseSchema<R extends AnyResultSchema> = ReturnType<
  typeof RpcResponseBaseSchema.extend<{ result: R }>
>;

type ResponseSchema<R extends AnyResultSchema> = ReturnType<
  typeof ErrorResponseSchema.or<ResultResponseSchema<R>>
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

type CannedResponseFn<P, R> = (params: { chain: Chain; params: P }) => R;

export class MethodDescriptor<
  M extends string,
  P extends AnyParamsSchema,
  R extends AnyResultSchema,
> {
  // schema for the entire rpc request
  public readonly requestSchema: RequestSchema<z.ZodLiteral<M>, P>;
  public readonly responseSchema: ResponseSchema<R>;
  public readonly methodName: M;
  public readonly methodSchema: z.ZodLiteral<M>;
  public readonly paramsSchema: P;
  public readonly resultSchema: R;
  public cacheConfig?: CacheConfig<z.infer<P>>;
  public cannedResponse?: CannedResponseFn<z.infer<P>, z.infer<R>>;

  constructor({
    methodName,
    methodSchema,
    paramsSchema,
    resultSchema,
    cacheConfig,
    cannedResponse,
  }: {
    methodName: M;
    methodSchema: z.ZodLiteral<M>;
    paramsSchema: P;
    resultSchema: R;
    cacheConfig?: CacheConfig<z.infer<P>>;
    cannedResponse?: CannedResponseFn<z.infer<P>, z.infer<R>>;
  }) {
    this.methodName = methodName;
    this.methodSchema = methodSchema;
    this.paramsSchema = paramsSchema;
    this.resultSchema = resultSchema;
    this.cacheConfig = cacheConfig;
    this.cannedResponse = cannedResponse;

    this.requestSchema = MinimalRpcRequestSchema.extend({
      method: methodSchema,
      params: paramsSchema,
    });

    this.responseSchema = ErrorResponseSchema.or(
      RpcResponseBaseSchema.extend({
        result: resultSchema,
      })
    );
  }

  public clone() {
    return new MethodDescriptor({
      methodName: this.methodName,
      methodSchema: this.methodSchema,
      paramsSchema: this.paramsSchema,
      resultSchema: this.resultSchema,
      cacheConfig: this.cacheConfig,
      cannedResponse: this.cannedResponse,
    });
  }

  public setCacheConfig(config: MethodDescriptor<M, P, R>["cacheConfig"]) {
    this.cacheConfig = config;

    return this;
  }

  public setCannedResponse(
    cannedResponse: MethodDescriptor<M, P, R>["cannedResponse"]
  ) {
    this.cannedResponse = cannedResponse;

    // TODO: is returning `this` confusing, since this is a mutating method?

    return this;
  }

  public static init = <
    InitMN extends string,
    InitP extends AnyParamsSchema,
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
    return new MethodDescriptor({
      methodName: name,
      methodSchema: z.literal(name),
      paramsSchema: params,
      resultSchema: result,
    });
  };
}

export type AnyMethodDescriptor = MethodDescriptor<
  any,
  AnyParamsSchema,
  AnyResultSchema
>;

export type MethodNameOf<MD extends AnyMethodDescriptor> = MD["methodName"];
