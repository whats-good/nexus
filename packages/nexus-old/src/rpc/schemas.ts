import { z } from "zod";
import { requiredUnknown } from "@src/utils";

const IntSchema = z.number().int();
const IntStringSchema = z.string().regex(/^[0-9]+$/);

export const RpcRequestIdSchema = IntSchema.or(IntStringSchema).nullish();
export type RpcRequestId = z.infer<typeof RpcRequestIdSchema>;

export const RpcRequestPayloadSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: RpcRequestIdSchema,
  method: z.string(),
  params: z.unknown().nullish(),
});

export type RpcRequestPayload = z.infer<typeof RpcRequestPayloadSchema>;

export const BaseResponsePayloadSchema = z.object({
  id: RpcRequestIdSchema,
  jsonrpc: z.literal("2.0"),
});

export type BaseResponsePayload = z.infer<typeof BaseResponsePayloadSchema>;

export const ErrorFieldSchema = z.object({
  code: z.number(),
  message: z.string(),
});

export type ErrorField = z.infer<typeof ErrorFieldSchema>;

export const ErrorResponsePayloadSchema = BaseResponsePayloadSchema.extend({
  error: ErrorFieldSchema,
});

export type ErrorResponsePayload = z.infer<typeof ErrorResponsePayloadSchema>;

export const BaseSuccessResponsePayloadSchema =
  BaseResponsePayloadSchema.extend({
    result: requiredUnknown(),
  });

export type BaseSuccessResponsePayload = z.infer<
  typeof BaseSuccessResponsePayloadSchema
>;

export const strictSuccessResponsePayloadSchemaOf = <R>(
  resultSchema: z.ZodType<R, any, any>
) => BaseSuccessResponsePayloadSchema.extend({ result: resultSchema });

export type StrictSuccessResponsePayloadSchema<R> = ReturnType<
  typeof strictSuccessResponsePayloadSchemaOf<R>
>;

export type StrictSuccessResponsePayload<R> = z.infer<
  StrictSuccessResponsePayloadSchema<R>
>;

export const strictRequestPayloadSchemaOf = <M extends string, P>(
  method: M,
  params: z.ZodType<P, any, any>
) =>
  RpcRequestPayloadSchema.extend({
    method: z.literal(method),
    params,
  });

export type StrictRequestPayloadSchema<M extends string, P> = ReturnType<
  typeof strictRequestPayloadSchemaOf<M, P>
>;

export type StrictRequestPayload<M extends string, P> = z.infer<
  StrictRequestPayloadSchema<M, P>
>;
