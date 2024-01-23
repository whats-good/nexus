import type { z } from "zod";
import { RpcMethodDescriptor } from "./rpc-method-descriptor";
import type { CannedResponseFn } from "./canned-response";

export class RpcMethodDescriptorBuilder<M extends string, P, R> {
  private fields: {
    method: M;
    params: z.ZodType<P, any, any>;
    result: z.ZodType<R, any, any>;
    cannedResponseFn?: CannedResponseFn<P, R>;
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
}
