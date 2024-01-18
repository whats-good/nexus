import { z } from "zod";

const IntSchema = z.number().int();
const IntStringSchema = z.string().regex(/^[0-9]+$/);

export const RpcRequestIdSchema = IntSchema.or(IntStringSchema).nullish();
export type RpcRequestId = z.infer<typeof RpcRequestIdSchema>;
