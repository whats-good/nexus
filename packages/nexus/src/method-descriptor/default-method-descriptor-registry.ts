import { z } from "zod";
import { MethodDescriptor } from "./method-descriptor";
import { RpcDescriptorRegistry } from "./method-descriptor-registry";

const methodDescriptors = [
  MethodDescriptor.init({
    name: "eth_blockNumber",
    params: [],
    result: z.number(),
  }).cache({
    ttl: ({ chain, params }) => {
      return chain.blockTime;
    },
    enabled: true,
  }),
  MethodDescriptor.init({
    name: "eth_getBalance",
    params: [z.string(), z.union([z.string(), z.number()])],
    result: z.string(),
  }).cache({
    ttl: ({ chain, params }) => {
      // const a = params[0];
      // const b = params[1];
      return chain.blockTime;
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
  }),
  MethodDescriptor.init({
    name: "eth_getBlockByHash",
    params: [
      z.union([z.string(), z.number()]),
      z.union([z.boolean(), z.number()]).optional(),
    ],
    result: z.string(),
  }),
] as const;

export const methodDescriptorRegistry = new RpcDescriptorRegistry(
  methodDescriptors
);
