import { z } from "zod";
import type { BigNumber } from "@ethersproject/bignumber";
import type { Chain } from "@src/chain";
import {
  JsonRPCErrorResponseSchema,
  JsonRpcResponseSchemaOf,
  JsonRpcResultResponseSchemaOf,
} from "@src/rpc-endpoint/json-rpc-types";
import type {
  JsonRPCResponse,
  JsonRpcResponseSchemaTypeOf,
  JsonRpcResultResponseSchemaTypeOf,
} from "@src/rpc-endpoint/json-rpc-types";

interface CacheConfigOptionReadFnParams<M extends string, P, R> {
  chain: Chain;
  params: P;
  highestKnownBlockNumber: BigNumber;
  methodDescriptor: MethodDescriptor<M, P, R>;
}
type CacheConfigOptionReadFn<T, M extends string, P, R> = (
  params: CacheConfigOptionReadFnParams<M, P, R>
) => T;
type CacheConfigOptionReadField<T, M extends string, P, R> =
  | T
  | CacheConfigOptionReadFn<T, M, P, R>;

interface CacheConfigOptionWriteFnParams<M extends string, P, R>
  extends CacheConfigOptionReadFnParams<M, P, R> {
  rawResponse: JsonRPCResponse;
  result: ReturnType<MethodDescriptor<M, P, R>["resultFromResponse"]>;
  error: ReturnType<MethodDescriptor<M, P, R>["errorFromResponse"]>;
}
type CacheConfigOptionWriteFn<T, M extends string, P, R> = (
  params: CacheConfigOptionWriteFnParams<M, P, R>
) => T;
type CacheConfigOptionWriteField<T, M extends string, P, R> =
  | T
  | CacheConfigOptionWriteFn<T, M, P, R>;

interface CacheConfigOptions<M extends string, P, R> {
  readEnabled?: CacheConfigOptionReadField<boolean, M, P, R>;
  writeEnabled?: CacheConfigOptionWriteField<boolean, M, P, R>;
  ttl: CacheConfigOptionWriteField<number, M, P, R>;
  paramsKeySuffix: CacheConfigOptionReadField<string, M, P, R> | null;
}

type CannedResponseFn<P, R> = (params: { chain: Chain; params: P }) => R;

type RequestFilterFn<P> = (params: { params: P }) => boolean;

class CacheConfig<M extends string, P, R> {
  constructor(
    private readonly options: CacheConfigOptions<M, P, R>,
    private readonly methodDescriptor: MethodDescriptor<M, P, R>
  ) {}

  public ttl(params: CacheConfigOptionWriteFnParams<M, P, R>) {
    if (typeof this.options.ttl === "function") {
      return this.options.ttl(params);
    }

    return this.options.ttl || 0;
  }

  public readEnabled(params: CacheConfigOptionReadFnParams<M, P, R>) {
    if (typeof this.options.readEnabled === "function") {
      return this.options.readEnabled(params);
    }

    return this.options.readEnabled !== false;
  }

  public writeEnabled(params: CacheConfigOptionWriteFnParams<M, P, R>) {
    if (!this.readEnabled(params)) {
      // does this make sense? we're not writing unless reading is enabled
      // TODO: what if read and write enabled values are different?
      return false;
    }

    if (typeof this.options.writeEnabled === "function") {
      return this.options.writeEnabled(params);
    }

    // by default, we don't write if the response is not a result response
    // but this can be overridden by passing a writeEnabled function that
    // determines under what conditions we should write to the cache.
    if (!this.methodDescriptor.resultFromResponse(params.rawResponse).success) {
      return false;
    }

    return this.options.writeEnabled !== false;
  }

  public paramsKeySuffix(params: CacheConfigOptionReadFnParams<M, P, R>) {
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
  public readonly responseSchema: JsonRpcResponseSchemaTypeOf<R>;
  public readonly resultResponseSchema: JsonRpcResultResponseSchemaTypeOf<R>;

  public cacheConfig?: CacheConfig<M, P, R>;
  public cannedResponse?: CannedResponseFn<P, R>;
  public requestFilter: RequestFilterFn<P>;

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
    this.responseSchema = JsonRpcResponseSchemaOf(result);
    this.resultResponseSchema = JsonRpcResultResponseSchemaOf(result);
    this.requestFilter = () => true;
  }

  public setCacheConfig(options: CacheConfigOptions<M, P, R>) {
    this.cacheConfig = new CacheConfig(options, this);

    return this;
  }

  public setCannedResponse(
    cannedResponse: MethodDescriptor<M, P, R>["cannedResponse"]
  ) {
    this.cannedResponse = cannedResponse;

    // TODO: is returning `this` confusing, since this is a mutating method?

    return this;
  }

  public resultFromResponse = (response: unknown) =>
    this.resultResponseSchema.safeParse(response);

  public setRequestFilter = (requestFilter: RequestFilterFn<P>) => {
    this.requestFilter = requestFilter;
    // TODO: is returning `this` confusing, since this is a mutating method?

    return this;
  };

  public errorFromResponse = (response: unknown) =>
    JsonRPCErrorResponseSchema.safeParse(response);
}

export type AnyMethodDescriptor = MethodDescriptor<any, any, any>;
export type UnknownMethodDescriptor = MethodDescriptor<any, unknown, unknown>;
