import { z } from "zod";

// TODO: migrate to the older whatsgood rpc-proxy schema validation,
// based on the input params.
export const JsonRPCResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number(),
  result: z.any(),
});

export const JsonRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number(),
  method: z.string(),
  params: z.array(z.any()),
});
