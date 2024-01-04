import { z } from "zod";
import type { BigNumber } from "@ethersproject/bignumber";
import type { Chain } from "@src/chain";

interface CacheConfigOptionReadFnParams<P> {
  chain: any;
  params: P;
  highestKnownBlockNumber: BigNumber;
}
type CacheConfigOptionReadFn<T, P> = (
  params: CacheConfigOptionReadFnParams<P>
) => T;
type CacheConfigOptionReadField<T, P> = T | CacheConfigOptionReadFn<T, P>;

interface CacheConfigOptionWriteFnParams<P, R>
  extends CacheConfigOptionReadFnParams<P> {
  result: R;
}
type CacheConfigOptionWriteFn<T, P, R> = (
  params: CacheConfigOptionWriteFnParams<P, R>
) => T;
type CacheConfigOptionWriteField<T, P, R> =
  | T
  | CacheConfigOptionWriteFn<T, P, R>;

interface CacheConfigOptions<P, R> {
  ttl: CacheConfigOptionWriteField<number, P, R>;
  enabled: CacheConfigOptionReadField<boolean, P>;
  paramsKeySuffix: CacheConfigOptionReadField<string, P> | null;
}

type CannedResponseFn<P, R> = (params: { chain: Chain; params: P }) => R;

class CacheConfig<P, R> {
  constructor(private readonly options: CacheConfigOptions<P, R>) {}

  public ttl(params: CacheConfigOptionWriteFnParams<P, R>) {
    if (typeof this.options.ttl === "function") {
      return this.options.ttl(params);
    }

    return this.options.ttl || 0;
  }

  public enabled(params: CacheConfigOptionReadFnParams<P>) {
    if (typeof this.options.enabled === "function") {
      return this.options.enabled(params);
    }

    return this.options.enabled || false;
  }

  public paramsKeySuffix(params: CacheConfigOptionReadFnParams<P>) {
    if (typeof this.options.paramsKeySuffix === "function") {
      return this.options.paramsKeySuffix(params);
    }

    return this.options.paramsKeySuffix || "";
  }
}

export class MethodDescriptor<M extends string, P, R> {
  public readonly method: M;
  public readonly methodSchema: z.ZodLiteral<M>;
  public readonly paramsSchema: z.ZodType<P, any, any>;
  public readonly resultSchema: z.ZodType<R, any, any>;

  public cacheConfig?: CacheConfig<P, R>;
  public cannedResponse?: CannedResponseFn<P, R>;

  constructor({
    method,
    params,
    result,
  }: {
    method: M;
    params: z.ZodType<P, any, any>;
    result: z.ZodType<R, any, any>;
  }) {
    this.method = method;
    this.methodSchema = z.literal(method);
    this.paramsSchema = params;
    this.resultSchema = result;
  }

  public setCacheConfig(options: CacheConfigOptions<P, R>) {
    this.cacheConfig = new CacheConfig(options);

    return this;
  }

  public setCannedResponse(
    cannedResponse: MethodDescriptor<M, P, R>["cannedResponse"]
  ) {
    this.cannedResponse = cannedResponse;

    // TODO: is returning `this` confusing, since this is a mutating method?

    return this;
  }
}

export type AnyMethodDescriptor = MethodDescriptor<any, any, any>;
