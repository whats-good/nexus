import { z } from "zod";
import {
  RpcRequestPayloadSchema,
  RpcResponseSuccessPayloadSchema,
} from "@src/rpc-schema";

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

export const eth_subscribeSuccessResponsePayloadSchema =
  RpcResponseSuccessPayloadSchema.extend({
    result: z.string(),
  });

export type EthSubscribeSuccessResponsePayloadType = z.infer<
  typeof eth_subscribeSuccessResponsePayloadSchema
>;

export const eth_subscriptionPayloadSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("eth_subscription"),
  params: z.object({
    subscription: z.string(),
    result: z.unknown(), // TODO: do better narrowing here
  }),
});

export type EthSubscriptionPayloadType = z.infer<
  typeof eth_subscriptionPayloadSchema
>;
