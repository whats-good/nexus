import { z } from "zod";
import type { Chain } from "@src/chain";
import type {
  StrictSuccessResponsePayloadSchema,
  StrictRequestPayloadSchema,
} from "@src/rpc/schemas";
import {
  strictRequestPayloadSchemaOf,
  strictSuccessResponsePayloadSchemaOf,
} from "@src/rpc/schemas";
import type {
  CannedResponseExecutionResult,
  CannedResponseFn,
} from "./canned-response";
import type {
  RequestFilterExecutionResult,
  RequestFilterFn,
} from "./request-filter";
import type { CacheConfig } from "./cache-config";

export class RpcMethodDescriptor<M extends string, P, R> {
  public readonly method: M;
  public readonly methodSchema: z.ZodLiteral<M>;
  public readonly paramsSchema: z.ZodType<P, any, any>;
  public readonly resultSchema: z.ZodType<R, any, any>;
  public readonly requestPayloadSchema: StrictRequestPayloadSchema<M, P>;
  public readonly successResponsePayloadSchema: StrictSuccessResponsePayloadSchema<R>;

  // TODO: should we pass a default value where cache config is always defined?
  public readonly cacheConfig?: CacheConfig<M, P, R>;

  private readonly cannedResponseFn?: CannedResponseFn<P, R>;
  private readonly requestFilterFn?: RequestFilterFn<P>;

  constructor({
    method,
    params,
    result,
    cannedResponseFn,
    requestFilterFn,
    cacheConfig,
  }: {
    method: M;
    params: z.ZodType<P, any, any>;
    result: z.ZodType<R, any, any>;
    cannedResponseFn?: CannedResponseFn<P, R>;
    requestFilterFn?: RequestFilterFn<P>;
    cacheConfig?: CacheConfig<M, P, R>;
  }) {
    this.method = method;
    this.methodSchema = z.literal(method);
    this.paramsSchema = params;
    this.resultSchema = result;
    this.successResponsePayloadSchema = strictSuccessResponsePayloadSchemaOf(
      this.resultSchema
    );
    this.requestPayloadSchema = strictRequestPayloadSchemaOf(
      this.method,
      params
    );
    this.cannedResponseFn = cannedResponseFn;
    this.requestFilterFn = requestFilterFn;
    this.cacheConfig = cacheConfig;
  }

  public cannedResponse(args: {
    chain: Chain;
    params: P;
  }): CannedResponseExecutionResult<R> {
    if (!this.cannedResponseFn) {
      return { kind: "no-canned-response" };
    }

    try {
      return {
        kind: "success",
        result: this.cannedResponseFn(args),
      };
    } catch (e) {
      return { kind: "failure", error: e };
    }
  }

  public requestFilter(args: {
    params: P;
    chain: Chain;
  }): RequestFilterExecutionResult {
    if (!this.requestFilterFn) {
      return { kind: "allow" };
    }

    try {
      if (this.requestFilterFn(args)) {
        return { kind: "allow" };
      }

      return { kind: "deny" };
    } catch (e) {
      return { kind: "failure", error: e };
    }
  }
}

export type UnknownRpcMethodDescriptor = RpcMethodDescriptor<
  string,
  unknown,
  unknown
>;
