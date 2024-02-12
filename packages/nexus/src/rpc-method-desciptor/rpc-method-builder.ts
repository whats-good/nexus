import type { z } from "zod";
import { RpcMethod } from "./rpc-method";
import type { CannedResponseFn } from "./canned-response";
import type { RequestFilterFn } from "./request-filter";
import { CacheConfig, type CacheConfigOptions } from "./cache-config";

export class RpcMethodBuilder<M extends string, P, R> {
  private fields: {
    method: M;
    params: z.ZodType<P, any, any>;
    result: z.ZodType<R, any, any>;
    cannedResponseFn?: CannedResponseFn<P, R>;
    requestFilterFn?: RequestFilterFn<P>;
    cacheConfig?: CacheConfig<P, R>;
  };

  constructor({
    method,
    params,
    result,
  }: {
    method: M;
    params: z.ZodType<P, any, any>;
    result: z.ZodType<R, any, any>;
  }) {
    this.fields = {
      method,
      params,
      result,
    };
  }

  public build(): RpcMethod<M, P, R> {
    return new RpcMethod(this.fields);
  }

  public cannedResponse(cannedResponseFn: CannedResponseFn<P, R>) {
    this.fields.cannedResponseFn = cannedResponseFn;

    return this;
  }

  public removeCannedResponse() {
    this.fields.cannedResponseFn = undefined;

    return this;
  }

  public requestFilter(requestFilterFn: RequestFilterFn<P>) {
    this.fields.requestFilterFn = requestFilterFn;

    return this;
  }

  public removeRequestFilter() {
    this.fields.requestFilterFn = undefined;

    return this;
  }

  public cacheConfig(cacheConfigOptions: CacheConfigOptions<P, R>) {
    this.fields.cacheConfig = new CacheConfig(cacheConfigOptions);

    return this;
  }

  public removeCacheConfig() {
    this.fields.cacheConfig = undefined;

    return this;
  }
}
