/* eslint-disable camelcase -- Disabling the camelCase rule, because eth method names are snake_cased */

import { z } from "zod";
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
import { RpcMethodDescriptor } from "./rpc-method-descriptor";

export const web3_clientVersion = new RpcMethodDescriptor({
  method: "web3_clientVersion",
  params: NoParams,
  result: z.string(),
});

export const web3_sha3 = new RpcMethodDescriptor({
  method: "web3_sha3",
  params: z.tuple([Bytes]),
  result: z.string(),
});

export const net_version = new RpcMethodDescriptor({
  method: "net_version",
  params: NoParams,
  result: z.string(),
});

export const net_listening = new RpcMethodDescriptor({
  method: "net_listening",
  params: NoParams,
  result: z.boolean(),
});

export const net_peerCount = new RpcMethodDescriptor({
  method: "net_peerCount",
  params: NoParams,
  result: Quantity,
});

export const eth_protocolVersion = new RpcMethodDescriptor({
  method: "eth_protocolVersion",
  params: NoParams,
  result: z.string(),
});

export const eth_syncing = new RpcMethodDescriptor({
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
});

export const eth_coinbase = new RpcMethodDescriptor({
  method: "eth_coinbase",
  params: NoParams,
  result: Address,
});
// TODO: should we even support this method? We're not a node,
// and nobody is mining anything

export const eth_chainId = new RpcMethodDescriptor({
  method: "eth_chainId",
  params: NoParams,
  result: Quantity,
});

export const eth_mining = new RpcMethodDescriptor({
  method: "eth_mining",
  params: NoParams,
  result: z.boolean(),
});

export const eth_hashrate = new RpcMethodDescriptor({
  method: "eth_hashrate",
  params: NoParams,
  result: Quantity,
});

export const eth_gasPrice = new RpcMethodDescriptor({
  method: "eth_gasPrice",
  params: NoParams,
  result: Quantity,
});

export const eth_accounts = new RpcMethodDescriptor({
  method: "eth_accounts",
  params: NoParams,
  result: z.array(Address),
});

export const eth_blockNumber = new RpcMethodDescriptor({
  method: "eth_blockNumber",
  params: NoParams,
  result: Quantity,
});

export const eth_getBalance = new RpcMethodDescriptor({
  method: "eth_getBalance",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Quantity,
});

export const eth_getStorageAt = new RpcMethodDescriptor({
  method: "eth_getStorageAt",
  params: z.tuple([Address, Quantity, BlockNumberOrTag]),
  result: Bytes,
});

export const eth_getTransactionCount = new RpcMethodDescriptor({
  method: "eth_getTransactionCount",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Quantity,
});

export const eth_getBlockTransactionCountByHash = new RpcMethodDescriptor({
  method: "eth_getBlockTransactionCountByHash",
  params: z.tuple([Bytes32]),
  result: Quantity,
});

export const eth_getBlockTransactionCountByNumber = new RpcMethodDescriptor({
  method: "eth_getBlockTransactionCountByNumber",
  params: z.tuple([BlockNumberOrTag]),
  result: Quantity,
});

export const eth_getUncleCountByBlockHash = new RpcMethodDescriptor({
  method: "eth_getUncleCountByBlockHash",
  params: z.tuple([Bytes32]),
  result: Quantity,
});

export const eth_getUncleCountByBlockNumber = new RpcMethodDescriptor({
  method: "eth_getUncleCountByBlockNumber",
  params: z.tuple([BlockNumberOrTag]),
  result: Quantity,
});

export const eth_getCode = new RpcMethodDescriptor({
  method: "eth_getCode",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Bytes,
});

export const eth_sign = new RpcMethodDescriptor({
  method: "eth_sign",
  params: z.tuple([Address, Bytes]),
  result: Bytes,
});
export const eth_signTransaction = new RpcMethodDescriptor({
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
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_sendTransaction = new RpcMethodDescriptor({
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
});
// TODO: should we support this method? it assumes the private key is held by the node

export const eth_sendRawTransaction = new RpcMethodDescriptor({
  method: "eth_sendRawTransaction",
  params: z.tuple([Bytes]),
  result: Bytes32,
});

export const eth_call = new RpcMethodDescriptor({
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
});

export const eth_estimateGas = new RpcMethodDescriptor({
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
});

// TODO: MARK AS UNSUPPORTED OR ACTUALLY IMPLEMENT!
export const eth_feeHistory = new RpcMethodDescriptor({
  method: "eth_feeHistory",
  params: z.unknown(),
  result: z.unknown(),
});

export const eth_getBlockByHash = new RpcMethodDescriptor({
  method: "eth_getBlockByHash",
  // TODO: is the boolean field actually nullable?
  params: z.union([
    z.tuple([Bytes32]),
    z.tuple([Bytes32, z.boolean().nullish()]),
  ]),
  result: Block.nullish(),
});

export const eth_getBlockByNumber = new RpcMethodDescriptor({
  method: "eth_getBlockByNumber",
  params: z.union([
    z.tuple([BlockNumberOrTag]),
    z.tuple([Bytes32, z.boolean().nullish()]),
  ]),
  result: Block.nullish(),
});

export const eth_getTransactionByHash = new RpcMethodDescriptor({
  method: "eth_getTransactionByHash",
  params: z.tuple([Bytes32]),
  result: MaybePendingTransaction.nullable(),
});

export const eth_getTransactionByBlockHashAndIndex = new RpcMethodDescriptor({
  method: "eth_getTransactionByBlockHashAndIndex",
  params: z.tuple([Bytes32, Quantity]),
  result: MaybePendingTransaction.nullable(),
});

export const eth_getTransactionByBlockNumberAndIndex = new RpcMethodDescriptor({
  method: "eth_getTransactionByBlockNumberAndIndex",
  params: z.tuple([BlockNumberOrTag, Quantity]),
  result: MaybePendingTransaction.nullable(),
});

export const eth_getTransactionReceipt = new RpcMethodDescriptor({
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
});

export const eth_getUncleByBlockHashAndIndex = new RpcMethodDescriptor({
  method: "eth_getUncleByBlockHashAndIndex",
  params: z.tuple([Bytes32, Quantity]),
  result: Block.nullish(),
});

export const eth_getUncleByBlockNumberAndIndex = new RpcMethodDescriptor({
  method: "eth_getUncleByBlockNumberAndIndex",
  params: z.tuple([BlockNumberOrTag, Quantity]),
  result: Block.nullish(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newFilter = new RpcMethodDescriptor({
  method: "eth_newFilter",
  params: z.tuple([FilterInput]),
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newBlockFilter = new RpcMethodDescriptor({
  method: "eth_newBlockFilter",
  params: NoParams,
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newPendingTransactionFilter = new RpcMethodDescriptor({
  method: "eth_newPendingTransactionFilter",
  params: NoParams,
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_uninstallFilter = new RpcMethodDescriptor({
  method: "eth_uninstallFilter",
  params: z.tuple([Quantity]),
  result: z.boolean(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getFilterChanges = new RpcMethodDescriptor({
  method: "eth_getFilterChanges",
  params: z.tuple([Quantity]),
  result: z.array(z.unknown()),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getFilterLogs = new RpcMethodDescriptor({
  method: "eth_getFilterLogs",
  params: z.tuple([Quantity]),
  result: z.array(z.unknown()),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getLogs = new RpcMethodDescriptor({
  method: "eth_getLogs",
  params: z.tuple([FilterInput]),
  result: z.array(z.unknown()),
});
// TODO: add proper caching logic

// TODO: research method and see how it should be supported
export const eth_getWork = new RpcMethodDescriptor({
  method: "eth_getWork",
  params: NoParams,
  result: z.tuple([Bytes32, Bytes32, Bytes32]),
});

// TODO: research method and see how it should be supported
export const eth_submitWork = new RpcMethodDescriptor({
  method: "eth_submitWork",
  params: z.tuple([Bytes8, Bytes32, Bytes32]),
  result: z.boolean(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getCompilers = new RpcMethodDescriptor({
  method: "eth_getCompilers",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileSolidity = new RpcMethodDescriptor({
  method: "eth_compileSolidity",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileLLL = new RpcMethodDescriptor({
  method: "eth_compileLLL",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileSerpent = new RpcMethodDescriptor({
  method: "eth_compileSerpent",
  params: z.unknown(),
  result: z.unknown(),
});

// // TODO: research method and see how it should be supported
export const eth_submitHashrate = new RpcMethodDescriptor({
  method: "eth_submitHashrate",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: read other JSON-RPC specs and see if there are any other methods
