/* eslint-disable camelcase -- Disabling the camelCase rule, because eth method names are snake_cased */

import { z } from "zod";
import { BigNumber } from "@ethersproject/bignumber";
import packageJson from "@package.json";
import {
  Address,
  BlockNumberOrTag,
  NoParams,
  Quantity,
  Bytes,
  Bytes32,
  Block,
  MaybePendingTransaction,
  Bytes256,
  FilterInput,
  Bytes8,
} from "./common";
import { RpcMethodDescriptorBuilder } from "./rpc-method-descriptor-builder";

export const web3_clientVersion = new RpcMethodDescriptorBuilder({
  method: "web3_clientVersion",
  params: NoParams,
  result: z.string(),
})
  .cannedResponse(() => `${packageJson.name}:${packageJson.version}`)
  .build();

export const web3_sha3 = new RpcMethodDescriptorBuilder({
  method: "web3_sha3",
  params: z.tuple([Bytes]),
  result: z.string(),
}).build();

export const net_version = new RpcMethodDescriptorBuilder({
  method: "net_version",
  params: NoParams,
  result: z.string(),
}).build();

export const net_listening = new RpcMethodDescriptorBuilder({
  method: "net_listening",
  params: NoParams,
  result: z.boolean(),
}).build();

export const net_peerCount = new RpcMethodDescriptorBuilder({
  method: "net_peerCount",
  params: NoParams,
  result: Quantity,
}).build();

export const eth_protocolVersion = new RpcMethodDescriptorBuilder({
  method: "eth_protocolVersion",
  params: NoParams,
  result: z.string(),
}).build();

export const eth_syncing = new RpcMethodDescriptorBuilder({
  method: "eth_syncing",
  params: NoParams,
  result: z.union([
    z.literal(false),
    z.object({
      startingBlock: Quantity,
      currentBlock: Quantity,
      highestBlock: Quantity,
    }),
  ]),
}).build();

export const eth_coinbase = new RpcMethodDescriptorBuilder({
  method: "eth_coinbase",
  params: NoParams,
  result: Address,
}).build();
// TODO: should we even support this method? We're not a node,
// and nobody is mining anything

export const eth_chainId = new RpcMethodDescriptorBuilder({
  method: "eth_chainId",
  params: NoParams,
  result: Quantity,
})
  .cannedResponse(({ chain }) => {
    const chainIdBigNumber = BigNumber.from(chain.chainId);

    return Quantity.parse(chainIdBigNumber.toHexString());
  })
  .build();

export const eth_mining = new RpcMethodDescriptorBuilder({
  method: "eth_mining",
  params: NoParams,
  result: z.boolean(),
}).build();

export const eth_hashrate = new RpcMethodDescriptorBuilder({
  method: "eth_hashrate",
  params: NoParams,
  result: Quantity,
}).build();

export const eth_gasPrice = new RpcMethodDescriptorBuilder({
  method: "eth_gasPrice",
  params: NoParams,
  result: Quantity,
}).build();

export const eth_accounts = new RpcMethodDescriptorBuilder({
  method: "eth_accounts",
  params: NoParams,
  result: z.array(Address),
}).build();

export const eth_blockNumber = new RpcMethodDescriptorBuilder({
  method: "eth_blockNumber",
  params: NoParams,
  result: Quantity,
})
  .cacheConfig({
    paramsKeySuffix: "",
    ttl: ({ chain }) => chain.blockTime * 1000,
  })
  .build();

export const eth_getBalance = new RpcMethodDescriptorBuilder({
  method: "eth_getBalance",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Quantity,
}).build();

export const eth_getStorageAt = new RpcMethodDescriptorBuilder({
  method: "eth_getStorageAt",
  params: z.tuple([Address, Quantity, BlockNumberOrTag]),
  result: Bytes,
}).build();

export const eth_getTransactionCount = new RpcMethodDescriptorBuilder({
  method: "eth_getTransactionCount",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Quantity,
}).build();

export const eth_getBlockTransactionCountByHash =
  new RpcMethodDescriptorBuilder({
    method: "eth_getBlockTransactionCountByHash",
    params: z.tuple([Bytes32]),
    result: Quantity,
  }).build();

export const eth_getBlockTransactionCountByNumber =
  new RpcMethodDescriptorBuilder({
    method: "eth_getBlockTransactionCountByNumber",
    params: z.tuple([BlockNumberOrTag]),
    result: Quantity,
  }).build();

export const eth_getUncleCountByBlockHash = new RpcMethodDescriptorBuilder({
  method: "eth_getUncleCountByBlockHash",
  params: z.tuple([Bytes32]),
  result: Quantity,
}).build();

export const eth_getUncleCountByBlockNumber = new RpcMethodDescriptorBuilder({
  method: "eth_getUncleCountByBlockNumber",
  params: z.tuple([BlockNumberOrTag]),
  result: Quantity,
}).build();

export const eth_getCode = new RpcMethodDescriptorBuilder({
  method: "eth_getCode",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Bytes,
}).build();

export const eth_sign = new RpcMethodDescriptorBuilder({
  method: "eth_sign",
  params: z.tuple([Address, Bytes]),
  result: Bytes,
}).build();
export const eth_signTransaction = new RpcMethodDescriptorBuilder({
  method: "eth_signTransaction",
  params: z.tuple([
    z.object({
      from: Address,
      to: Address.nullish(),
      gas: Quantity.nullish(),
      gasPrice: Quantity.nullish(),
      value: Quantity.nullish(),
      data: Bytes, // TODO: is this always nonNullable?
      nonce: Quantity.nullish(),
    }),
  ]),
  result: Bytes,
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_sendTransaction = new RpcMethodDescriptorBuilder({
  method: "eth_sendTransaction",
  params: z.tuple([
    z.object({
      from: Address,
      to: Address.nullish(),
      gas: Quantity.nullish(),
      gasPrice: Quantity.nullish(),
      value: Quantity.nullish(),
      input: Bytes, // TODO: is this always nonNullable?
      nonce: Quantity.nullish(),
    }),
  ]),
  result: Bytes32,
}).build();
// TODO: should we support this method? it assumes the private key is held by the node

export const eth_sendRawTransaction = new RpcMethodDescriptorBuilder({
  method: "eth_sendRawTransaction",
  params: z.tuple([Bytes]),
  result: Bytes32,
}).build();

export const eth_call = new RpcMethodDescriptorBuilder({
  method: "eth_call",
  params: z.tuple([
    z.object({
      from: Address.nullish(),
      to: Address,
      gas: Quantity.nullish(),
      gasPrice: Quantity.nullish(),
      value: Quantity.nullish(),
      input: Bytes.nullish(),
    }),
    BlockNumberOrTag,
  ]),
  result: Bytes,
}).build();

export const eth_estimateGas = new RpcMethodDescriptorBuilder({
  method: "eth_estimateGas",
  params: z.tuple([
    z.object({
      from: Address.nullish(),
      to: Address.nullish(),
      gas: Quantity.nullish(),
      gasPrice: Quantity.nullish(),
      value: Quantity.nullish(),
      input: Bytes.nullish(),
    }),
  ]),
  result: Quantity,
}).build();

// TODO: MARK AS UNSUPPORTED OR ACTUALLY IMPLEMENT!
export const eth_feeHistory = new RpcMethodDescriptorBuilder({
  method: "eth_feeHistory",
  params: z.unknown(),
  result: z.unknown(),
}).build();

export const eth_getBlockByHash = new RpcMethodDescriptorBuilder({
  method: "eth_getBlockByHash",
  // TODO: is the boolean field actually nullable?
  params: z.union([
    z.tuple([Bytes32]),
    z.tuple([Bytes32, z.boolean().nullish()]),
  ]),
  result: Block.nullish(),
}).build();

export const eth_getBlockByNumber = new RpcMethodDescriptorBuilder({
  method: "eth_getBlockByNumber",
  params: z.union([
    z.tuple([BlockNumberOrTag]),
    z.tuple([Bytes32, z.boolean().nullish()]),
  ]),
  result: Block.nullish(),
}).build();

export const eth_getTransactionByHash = new RpcMethodDescriptorBuilder({
  method: "eth_getTransactionByHash",
  params: z.tuple([Bytes32]),
  result: MaybePendingTransaction.nullable(),
}).build();

export const eth_getTransactionByBlockHashAndIndex =
  new RpcMethodDescriptorBuilder({
    method: "eth_getTransactionByBlockHashAndIndex",
    params: z.tuple([Bytes32, Quantity]),
    result: MaybePendingTransaction.nullable(),
  }).build();

export const eth_getTransactionByBlockNumberAndIndex =
  new RpcMethodDescriptorBuilder({
    method: "eth_getTransactionByBlockNumberAndIndex",
    params: z.tuple([BlockNumberOrTag, Quantity]),
    result: MaybePendingTransaction.nullable(),
  }).build();

export const eth_getTransactionReceipt = new RpcMethodDescriptorBuilder({
  method: "eth_getTransactionReceipt",
  params: z.tuple([Bytes32]),
  result: z
    .object({
      transactionHash: Bytes32,
      transactionIndex: Quantity,
      blockHash: Bytes32,
      blockNumber: Quantity,
      from: Address,
      to: Address.nullish(),
      cumulativeGasUsed: Quantity,
      effectiveGasPrice: Quantity.nullish(), // TODO: should this be nullish? it's not documented on infura
      gasUsed: Quantity,
      contractAddress: Address.nullish(),
      logs: z.array(z.unknown()),
      logsBloom: Bytes256,
      type: Quantity.nullish(),
      root: Bytes32.nullish(),
      status: Quantity.nullish(),
    })
    .nullish(),
}).build();

export const eth_getUncleByBlockHashAndIndex = new RpcMethodDescriptorBuilder({
  method: "eth_getUncleByBlockHashAndIndex",
  params: z.tuple([Bytes32, Quantity]),
  result: Block.nullish(),
}).build();

export const eth_getUncleByBlockNumberAndIndex = new RpcMethodDescriptorBuilder(
  {
    method: "eth_getUncleByBlockNumberAndIndex",
    params: z.tuple([BlockNumberOrTag, Quantity]),
    result: Block.nullish(),
  }
).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newFilter = new RpcMethodDescriptorBuilder({
  method: "eth_newFilter",
  params: z.tuple([FilterInput]),
  result: Quantity,
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newBlockFilter = new RpcMethodDescriptorBuilder({
  method: "eth_newBlockFilter",
  params: NoParams,
  result: Quantity,
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newPendingTransactionFilter = new RpcMethodDescriptorBuilder({
  method: "eth_newPendingTransactionFilter",
  params: NoParams,
  result: Quantity,
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_uninstallFilter = new RpcMethodDescriptorBuilder({
  method: "eth_uninstallFilter",
  params: z.tuple([Quantity]),
  result: z.boolean(),
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getFilterChanges = new RpcMethodDescriptorBuilder({
  method: "eth_getFilterChanges",
  params: z.tuple([Quantity]),
  result: z.array(z.unknown()),
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getFilterLogs = new RpcMethodDescriptorBuilder({
  method: "eth_getFilterLogs",
  params: z.tuple([Quantity]),
  result: z.array(z.unknown()),
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getLogs = new RpcMethodDescriptorBuilder({
  method: "eth_getLogs",
  params: z.tuple([FilterInput]),
  result: z.array(z.unknown()),
}).build();
// TODO: add proper caching logic

// TODO: research method and see how it should be supported
export const eth_getWork = new RpcMethodDescriptorBuilder({
  method: "eth_getWork",
  params: NoParams,
  result: z.tuple([Bytes32, Bytes32, Bytes32]),
}).build();

// TODO: research method and see how it should be supported
export const eth_submitWork = new RpcMethodDescriptorBuilder({
  method: "eth_submitWork",
  params: z.tuple([Bytes8, Bytes32, Bytes32]),
  result: z.boolean(),
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getCompilers = new RpcMethodDescriptorBuilder({
  method: "eth_getCompilers",
  params: z.unknown(),
  result: z.unknown(),
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileSolidity = new RpcMethodDescriptorBuilder({
  method: "eth_compileSolidity",
  params: z.unknown(),
  result: z.unknown(),
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileLLL = new RpcMethodDescriptorBuilder({
  method: "eth_compileLLL",
  params: z.unknown(),
  result: z.unknown(),
}).build();

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileSerpent = new RpcMethodDescriptorBuilder({
  method: "eth_compileSerpent",
  params: z.unknown(),
  result: z.unknown(),
}).build();

// // TODO: research method and see how it should be supported
export const eth_submitHashrate = new RpcMethodDescriptorBuilder({
  method: "eth_submitHashrate",
  params: z.unknown(),
  result: z.unknown(),
}).build();

// TODO: read other JSON-RPC specs and see if there are any other methods
