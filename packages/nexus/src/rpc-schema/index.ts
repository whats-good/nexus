import { z } from "zod";
import { IntSchema, IntStringSchema, requiredUnknown } from "@src/utils";

/*************** Common ***************/

export const RpcRequestIdSchema = IntSchema.or(IntStringSchema).nullish();
export type RpcRequestId = z.infer<typeof RpcRequestIdSchema>;

/*************** RPC Request ***************/

export const RpcRequestPayloadSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: RpcRequestIdSchema,
  method: z.string(),
  params: z.unknown().nullish(),
});

export type RpcRequestPayloadType = z.infer<typeof RpcRequestPayloadSchema>;

/*************** RPC Response ***************/

export const RpcResponsePayloadBaseSchema = z.object({
  id: RpcRequestIdSchema,
  jsonrpc: z.literal("2.0"),
});

export type RpcResponsePayloadBaseType = z.infer<
  typeof RpcResponsePayloadBaseSchema
>;

export const RpcResponseSuccessPayloadSchema =
  RpcResponsePayloadBaseSchema.extend({
    result: requiredUnknown(),
  });

export type RpcResponseSuccessPayloadType = z.infer<
  typeof RpcResponseSuccessPayloadSchema
>;

export const RpcResponseErrorFieldSchema = z.object({
  code: z.number(),
  message: z.string(),
});

export type RpcResponseErrorFieldType = z.infer<
  typeof RpcResponseErrorFieldSchema
>;

export const RpcResponseErrorPayloadSchema =
  RpcResponsePayloadBaseSchema.extend({
    error: RpcResponseErrorFieldSchema,
  });

export type RpcResponseErrorPayloadType = z.infer<
  typeof RpcResponseErrorPayloadSchema
>;
