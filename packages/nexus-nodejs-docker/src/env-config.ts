import { z } from "zod";
import {
  IntSchema,
  JSONStringSchema,
  NumberFromIntStringSchema,
  mapTuple,
} from "./utils";
import { NodeProvider, CHAIN } from "@whatsgood/nexus";

const ENV_CHAIN_SCHEMA = z.object({
  name: z.string(),
  chainId: IntSchema,
  blockTime: IntSchema,
});

const ENV_CHAINS_ARRAY_SCHEMA = z.array(ENV_CHAIN_SCHEMA);

const ENV_NODE_PROVIDER_SCHEMA = z.object({
  name: z.string(),
  url: z.string().url(),
  chainId: IntSchema,
});

const ENV_NODE_PROVIDERS_ARRAY_SCHEMA = z
  .array(ENV_NODE_PROVIDER_SCHEMA)
  .nonempty();

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
  NODE_PROVIDERS: JSONStringSchema.pipe(ENV_NODE_PROVIDERS_ARRAY_SCHEMA),
  // TODO: relay config
  // TODO: auth config
});

export type EnvType = z.infer<typeof EnvSchema>;

export function getEnvConfig() {
  const env = EnvSchema.parse(process.env);
  const defaultChains = Object.values(CHAIN);
  const chainsMap = new Map(
    defaultChains.map((chain) => [chain.chainId, chain])
  );

  env.CHAINS?.forEach((chain) => {
    // TODO: add warning logs for overwriting default chains
    chainsMap.set(chain.chainId, chain);
  });

  const nodeProviders = mapTuple(env.NODE_PROVIDERS, (nodeProvider) => {
    const chain = chainsMap.get(nodeProvider.chainId);

    if (!chain) {
      throw new Error(
        `NodeProvider configured with unregistered chainId: ${nodeProvider.chainId}. Add the chain to the CHAINS env variable.`
      );
    }

    return new NodeProvider({
      name: nodeProvider.name,
      url: nodeProvider.url,
      chain,
    });
  });

  return {
    nodeProviders,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
  };
}
