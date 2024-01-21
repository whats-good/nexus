import { z } from "zod";

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

export const ErrorResponsePayloadSchema = BaseResponsePayloadSchema.extend({
  error: z.object({
    code: z.number(),
    message: z.string(),
  }),
});

export type ErrorResponsePayload = z.infer<typeof ErrorResponsePayloadSchema>;

export const SuccessResponsePayloadSchema = BaseResponsePayloadSchema.extend({
  result: z.unknown(),
});

export type SuccessResponsePayload = z.infer<
  typeof SuccessResponsePayloadSchema
>;
