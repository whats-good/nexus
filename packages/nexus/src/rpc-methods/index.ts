import { z } from "zod";
import { RpcRequestPayloadSchema } from "@src/rpc-schema";

export const eth_subscribe_newHeads = RpcRequestPayloadSchema.extend({
  method: z.literal("eth_subscribe"),
  params: z.tuple([
    z.literal("newHeads"),
    // TODO: can this method have more params?
  ]),
});

export const eth_subscribe_newPendingTransactions =
  RpcRequestPayloadSchema.extend({
    method: z.literal("eth_subscribe"),
    params: z.tuple([
      z.literal("newPendingTransactions"),
      // TODO: can this method have more params?
    ]),
  });

export const eth_subscribe = z.union([
  eth_subscribe_newHeads,
  eth_subscribe_newPendingTransactions,
]);

export type EthSubscribeRpcPayloadType = z.infer<typeof eth_subscribe>;
