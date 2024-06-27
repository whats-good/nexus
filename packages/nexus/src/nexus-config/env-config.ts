import { z } from "zod";
import {
  IntSchema,
  JSONStringSchema,
  NumberFromIntStringSchema,
} from "@src/utils";

const ENV_CHAIN_SCHEMA = z.object({
  name: z.string(),
  chainId: IntSchema,
  blockTime: IntSchema,
});

const ENV_CHAINS_ARRAY_SCHEMA = z.array(ENV_CHAIN_SCHEMA);

const ENV_NODE_PROVIDER_SCHEMA = z.object({
  name: z.string(),
  url: z.string(),
  chainId: IntSchema,
});

const ENV_NODE_PROVIDERS_ARRAY_SCHEMA = z.array(ENV_NODE_PROVIDER_SCHEMA);

export const EnvSchema = z.object({
  PORT: NumberFromIntStringSchema.optional(),
  LOG_LEVEL: z
    .union([
      z.literal("trace"),
      z.literal("debug"),
      z.literal("info"),
      z.literal("warn"),
      z.literal("error"),
      z.literal("fatal"),
    ])
    .optional(),
  CHAINS: JSONStringSchema.pipe(ENV_CHAINS_ARRAY_SCHEMA).optional(),
  NODE_PROVIDERS: JSONStringSchema.pipe(
    ENV_NODE_PROVIDERS_ARRAY_SCHEMA
  ).optional(),
  // TODO: relay config
  // TODO: auth config
});

export type EnvType = z.infer<typeof EnvSchema>;
