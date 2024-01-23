import { z } from "zod";
import type { Chain } from "@src/chain";
import type {
  CannedResponseExecutionResult,
  CannedResponseFn,
} from "./canned-response";

export class RpcMethodDescriptor<M extends string, P, R> {
  public readonly method: M;
  public readonly methodSchema: z.ZodLiteral<M>;
  public readonly paramsSchema: z.ZodType<P, any, any>;
  public readonly resultSchema: z.ZodType<R, any, any>;

  private readonly cannedResponseFn?: CannedResponseFn<P, R>;

  constructor({
    method,
    params,
    result,
    cannedResponseFn,
  }: {
    method: M;
    params: z.ZodType<P, any, any>;
    result: z.ZodType<R, any, any>;
    cannedResponseFn?: CannedResponseFn<P, R>;
  }) {
    this.method = method;
    this.methodSchema = z.literal(method);
    this.paramsSchema = params;
    this.resultSchema = result;
    this.cannedResponseFn = cannedResponseFn;
  }

  public cannedResponse(params: {
    chain: Chain;
    params: P;
  }): CannedResponseExecutionResult<R> {
    if (!this.cannedResponseFn) {
      return { kind: "no-canned-response" };
    }

    return {
      kind: "success",
      result: this.cannedResponseFn(params),
    };
  }
}

export type UnknownRpcMethodDescriptor = RpcMethodDescriptor<
  string,
  unknown,
  unknown
>;
