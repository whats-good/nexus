import type { z } from "zod";
import { RpcMethodDescriptor } from "./rpc-method-descriptor";
import type { CannedResponseFn } from "./canned-response";
import type { RequestFilterFn } from "./request-filter";

export class RpcMethodDescriptorBuilder<M extends string, P, R> {
  private fields: {
    method: M;
    params: z.ZodType<P, any, any>;
    result: z.ZodType<R, any, any>;
    cannedResponseFn?: CannedResponseFn<P, R>;
    requestFilterFn?: RequestFilterFn<P>;
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

  public build(): RpcMethodDescriptor<M, P, R> {
    return new RpcMethodDescriptor(this.fields);
  }

  public cannedResponse(cannedResponseFn: CannedResponseFn<P, R>) {
    this.fields.cannedResponseFn = cannedResponseFn;

    return this;
  }

  public requestFilter(requestFilterFn: RequestFilterFn<P>) {
    this.fields.requestFilterFn = requestFilterFn;

    return this;
  }
}
