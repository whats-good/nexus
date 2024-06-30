import { z } from "zod";
import {
  IntSchema,
  JSONStringSchema,
  NumberFromIntStringSchema,
} from "@src/utils";
import type { Chain } from "@src/chain";
import { NodeProvider } from "@src/node-provider";
import type { RelayConfig } from "@src/node-endpoint";
import { CHAIN } from "@src/default-chains";

const ENV_CHAIN_SCHEMA = z.object({
  name: z.string(),
  chainId: IntSchema,
  blockTime: IntSchema,
});

const ENV_CHAINS_ARRAY_SCHEMA = JSONStringSchema.pipe(
  z.array(ENV_CHAIN_SCHEMA)
);

const ENV_NODE_PROVIDER_SCHEMA = z.object({
  name: z.string(),
  url: z.string().url(),
  chainId: IntSchema,
});

const ENV_NODE_PROVIDERS_ARRAY_SCHEMA = JSONStringSchema.pipe(
  z.array(ENV_NODE_PROVIDER_SCHEMA).nonempty()
);

const ENV_RELAY_ORDER_SCHEMA = z.union([
  z.literal("random"),
  z.literal("sequential"),
]);

const ENV_RELAY_FAILURE_CYCLE_REQUESTS_SCHEMA = JSONStringSchema.pipe(
  z.tuple([z.literal("cycle-requests"), IntSchema])
);

const ENV_RELAY_FAILURE = z.union([
  z.literal("fail-immediately"),
  ENV_RELAY_FAILURE_CYCLE_REQUESTS_SCHEMA,
]);

export const EnvSchema = z.object({
  NEXUS_PORT: NumberFromIntStringSchema.optional(),
  NEXUS_LOG_LEVEL: z
    .union([
      z.literal("trace"),
      z.literal("debug"),
      z.literal("info"),
      z.literal("warn"),
      z.literal("error"),
      z.literal("fatal"),
    ])
    .optional(),
  NEXUS_CHAINS: ENV_CHAINS_ARRAY_SCHEMA.optional(),
  NEXUS_NODE_PROVIDERS: ENV_NODE_PROVIDERS_ARRAY_SCHEMA.optional(),
  NEXUS_RELAY_ORDER: ENV_RELAY_ORDER_SCHEMA.optional(),
  NEXUS_RELAY_FAILURE: ENV_RELAY_FAILURE.optional(),
  NEXUS_RPC_AUTH_KEY: z.string().optional(),
});

export type EnvConfig = ReturnType<typeof getEnvConfig>;

export function getEnvConfig() {
  const {
    NEXUS_NODE_PROVIDERS,
    NEXUS_CHAINS,
    NEXUS_LOG_LEVEL,
    NEXUS_PORT,
    NEXUS_RELAY_FAILURE,
    NEXUS_RELAY_ORDER,
    NEXUS_RPC_AUTH_KEY,
  } = EnvSchema.parse(process.env);
  const defaultChains = Object.values(CHAIN);
  const chainsMap = new Map(
    defaultChains.map((chain) => [chain.chainId, chain])
  );

  const overwrittenChainsMap = new Map<number, Chain>();

  NEXUS_CHAINS?.forEach((chain) => {
    if (chainsMap.has(chain.chainId)) {
      overwrittenChainsMap.set(chain.chainId, chain);
    }

    chainsMap.set(chain.chainId, chain);
  });

  const nodeProviders = NEXUS_NODE_PROVIDERS?.map((nodeProvider) => {
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

  const relay: Partial<RelayConfig> = {};

  if (NEXUS_RELAY_ORDER) {
    relay.order = NEXUS_RELAY_ORDER;
  }

  if (NEXUS_RELAY_FAILURE) {
    if (NEXUS_RELAY_FAILURE === "fail-immediately") {
      relay.failure = { kind: "fail-immediately" };
    } else {
      const [kind, maxAttempts] = NEXUS_RELAY_FAILURE;

      relay.failure = { kind, maxAttempts };
    }
  }

  return {
    nodeProviders: nodeProviders ?? [],
    port: NEXUS_PORT,
    logLevel: NEXUS_LOG_LEVEL,
    relay,
    rpcAuthKey: NEXUS_RPC_AUTH_KEY,
    overwrittenChains: Array.from(overwrittenChainsMap.values()),
  };
}
