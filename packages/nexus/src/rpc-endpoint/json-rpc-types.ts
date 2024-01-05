import { z } from "zod";

export const RpcRequestIdSchema = z.union([z.string(), z.number()]);

// TODO: migrate to the older whatsgood rpc-proxy schema validation,
// based on the input params.
export const JsonRPCResultResponseSchema = z.object({
  id: RpcRequestIdSchema.nullish(),
  jsonrpc: z.literal("2.0"),
  result: z.unknown(),
});

export const JsonRPCErrorResponseSchema = z.object({
  id: RpcRequestIdSchema.nullish(),
  jsonrpc: z.literal("2.0"),
  error: z.object({
    code: z.number(),
    message: z.string(),
  }),
});

export const JsonRPCResponseSchema = z.union([
  JsonRPCResultResponseSchema,
  JsonRPCErrorResponseSchema,
]);

export const JsonRPCRequestSchema = z.object({
  id: RpcRequestIdSchema.nullish(),
  method: z.string(),
  jsonrpc: z.literal("2.0"),
  params: z.array(z.unknown()).nullish(),
});

export type JsonRPCRequest = z.infer<typeof JsonRPCRequestSchema>;
export type JsonRPCResultResponse = z.infer<typeof JsonRPCResultResponseSchema>;
export type JsonRPCResponse = z.infer<typeof JsonRPCResponseSchema>;
export type JsonRPCErrorResponse = z.infer<typeof JsonRPCErrorResponseSchema>;

export const JsonRpcResultResponseSchemaOf = <R>(
  resultSchema: z.ZodType<R, any, any>
) =>
  z.object({
    id: RpcRequestIdSchema.nullish(),
    jsonrpc: z.literal("2.0"),
    result: resultSchema,
  });

export type JsonRpcResultResponseSchemaTypeOf<R> = ReturnType<
  typeof JsonRpcResultResponseSchemaOf<R>
>;

export const JsonRpcResponseSchemaOf = <R>(
  resultSchema: z.ZodType<R, any, any>
) =>
  z.union([
    JsonRpcResultResponseSchemaOf(resultSchema),
    JsonRPCErrorResponseSchema,
  ]);

export type JsonRpcResponseSchemaTypeOf<R> = ReturnType<
  typeof JsonRpcResponseSchemaOf<R>
>;

export type JsonRpcResponseOf<R> = z.infer<
  ReturnType<typeof JsonRpcResponseSchemaOf<R>>
>;
