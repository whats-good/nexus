import { z } from "zod";
import { MethodDescriptorRegistry, descriptor } from "./method-descriptor";

const baseRegistry = new MethodDescriptorRegistry([
  descriptor("__ignore", [z.never()], z.never()),
]);

export const methodDescriptorRegistry = baseRegistry
  .methodDescriptor({
    name: "eth_getBlockByHash",
    params: [
      z.union([z.string(), z.number()]),
      z.union([z.boolean(), z.number()]).optional(),
    ],
    result: z.string(),
  })
  .methodDescriptor({
    name: "eth_getBlockByNumber",
    params: [
      z.union([z.string(), z.number()]),
      z.union([z.boolean(), z.number()]).optional(),
    ],
    result: z.string(),
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
