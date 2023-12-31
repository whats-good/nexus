import { z } from "zod";
import { MethodDescriptorRegistry } from "./method-descriptor";

const baseRegistry = MethodDescriptorRegistry.init();

export const methodDescriptorRegistry = baseRegistry
  .methodDescriptor({
    name: "eth_getBlockByHash",
    params: [
      z.union([z.string(), z.number()]),
      z.union([z.boolean(), z.number()]).optional(),
    ],
    result: z.string(),
    caching: {
      enabled: true,
      ttl: Number.POSITIVE_INFINITY,
    },
  })
  .methodDescriptor({
    name: "eth_getBlockByNumber",
    params: [
      z.union([z.string(), z.number()]),
      z.union([z.boolean(), z.number()]).optional(),
    ],
    result: z.string(),
    caching: {
      enabled: true,
    },
  })
  .methodDescriptor({
    name: "eth_blockNumber",
    params: [],
    result: z.number(),
  })
  .methodDescriptor({
    name: "eth_getBalance",
    params: [z.string(), z.union([z.string(), z.number()])],
    result: z.string(),
  });
