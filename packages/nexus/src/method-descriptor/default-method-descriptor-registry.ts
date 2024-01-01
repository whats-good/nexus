import { z } from "zod";
import { MethodDescriptor } from "./method-descriptor";
import { RpcDescriptorRegistry } from "./method-descriptor-registry";

// TODO: write a documentation page that explains how each method is treated.
// including caching behavior.
// look into https://www.quicknode.com/docs/ethereum/eth_accounts for inspiration.

const methodDescriptors = [
  MethodDescriptor.init({
    name: "eth_blockNumber",
    params: [],
    result: z.number(),
  }).cache({
    ttl: ({ chain }) => {
      return chain.blockTime;
    },
    paramsKeySuffix: null,
    enabled: true,
  }),
  MethodDescriptor.init({
    name: "eth_chainId",
    params: [],
    result: z.number(),
  }).cache({
    // TODO: should this be cached?
    // or should we just use the chain id from the config?
    ttl: Number.POSITIVE_INFINITY,
    paramsKeySuffix: null,
    enabled: true,
  }),
  MethodDescriptor.init({
    name: "eth_getBalance",
    params: [z.string(), z.union([z.string(), z.number()])],
    result: z.string(),
  }).cache({
    ttl: ({ chain }) => chain.blockTime,
    paramsKeySuffix: ({ params }) => {
      const [address, blockNumber] = params;

      return `${address}-${blockNumber}`;
    },
    enabled: true,
  }),
  MethodDescriptor.init({
    name: "eth_getBlockByNumber",
    params: [
      z.union([z.string(), z.number()]),
      z.union([z.boolean(), z.number()]).optional(),
    ],
    result: z.string(),
  }).cache({
    ttl: ({ chain }) => chain.blockTime, // TODO: what's a better default here?
    paramsKeySuffix: ({ params }) => {
      const [blockNumber, includeTransactions] = params;

      return `${blockNumber}-${includeTransactions}`;
    },
    enabled: true,
  }),
  MethodDescriptor.init({
    name: "eth_getBlockByHash",
    params: [
      z.union([z.string(), z.number()]),
      z.union([z.boolean(), z.number()]).optional(),
    ],
    result: z.string(),
  }).cache({
    enabled: true,
    ttl: Number.POSITIVE_INFINITY,
    paramsKeySuffix: ({ params }) => {
      const [blockHash, includeTransactionsFlag] = params;
      const includeTransactions = includeTransactionsFlag
        ? "tx-included"
        : "tx-excluded";

      return `${blockHash}-${includeTransactions}`;
    },
  }),
] as const;

export const methodDescriptorRegistry = new RpcDescriptorRegistry(
  methodDescriptors
);
