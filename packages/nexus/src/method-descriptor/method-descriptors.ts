/* eslint-disable camelcase -- Disabling the camelCase rule, because eth method names are snake_cased */

import { z } from "zod";
import { BigNumber } from "@ethersproject/bignumber";
import type { Chain } from "@src/chain";
import packageJson from "../../package.json";
import { MethodDescriptor } from "./method-descriptor";
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

const FIVE_MINUTES_IN_SECONDS = 5 * 60;

// TODO: test
const ttlFromBlockNumberOrTag = ({
  chain,
  highestKnownBlockNumber,
  blockNumberOrTag,
}: {
  chain: Chain;
  highestKnownBlockNumber: BigNumber;
  blockNumberOrTag: z.infer<typeof BlockNumberOrTag>;
}): number => {
  if (
    blockNumberOrTag === "latest" ||
    blockNumberOrTag === "safe" ||
    blockNumberOrTag === "pending"
  ) {
    return chain.blockTime * 1_000;
  } else if (blockNumberOrTag === "earliest") {
    // TODO: if the sender isn't satisfied with this result
    // they should have the option to override the cache
    return Number.POSITIVE_INFINITY;
  } else if (blockNumberOrTag === "finalized") {
    // TODO: this value should come from the chain config.
    // every chain has a different finality threshold.
    // for now, we're caching the bare minimum.
    return chain.blockTime * 1_000;
  }

  const minNumBlocks = FIVE_MINUTES_IN_SECONDS / chain.blockTime;
  const blockNumber = BigNumber.from(blockNumberOrTag);

  if (blockNumber.add(minNumBlocks).lte(highestKnownBlockNumber)) {
    return Number.POSITIVE_INFINITY;
  }

  return chain.blockTime * 1_000;
};

// TODO: does it even make sense to describe methods that won't be
// cached?

// TODO: write a documentation page that explains how each method is treated.
// including caching behavior.
// look into https://www.quicknode.com/docs/ethereum/eth_accounts for inspiration.

export const web3_clientVersion = new MethodDescriptor({
  method: "web3_clientVersion",
  params: NoParams,
  result: z.string(),
}).setCannedResponse(() => {
  return `${packageJson.name}@${packageJson.version}`;
});

export const web3_sha3 = new MethodDescriptor({
  method: "web3_sha3",
  params: z.tuple([Bytes]),
  result: z.string(),
});
// .cache({
//   ttl: Number.POSITIVE_INFINITY,
//   paramsKeySuffix:
// });
// TODO: should we override and implement this method ourselves? since caching
// would require us to run some form of hashing on the input, and at that point
// we might as well just implement the method ourselves.

// TODO: this is the network id. slightly different than chain id.
// these could also come from the chain config. for now, we're just
// infinitely caching them.
export const net_version = new MethodDescriptor({
  method: "net_version",
  params: NoParams,
  result: z.string(),
}).setCacheConfig({
  paramsKeySuffix: null,
  ttl: Number.POSITIVE_INFINITY,
  readEnabled: true,
});

export const net_listening = new MethodDescriptor({
  method: "net_listening",
  params: NoParams,
  result: z.boolean(),
});
// TODO: should we just not implement this method since we're
// just a proxy and the meaning of this method will change as
// soon as a different provider is hit behind the scenes?

export const net_peerCount = new MethodDescriptor({
  method: "net_peerCount",
  params: NoParams,
  result: Quantity,
});
// TODO: should we just not implement this method since we're just
// a proxy and the meaning of this method will change as soon as
// a different provider is hit behind the scenes?

export const eth_protocolVersion = new MethodDescriptor({
  method: "eth_protocolVersion",
  params: NoParams,
  result: z.string(),
});
// TODO: how should we cache this? should we cache it at all?
// should we just return a pre-defined value, e.g 0x40?

export const eth_syncing = new MethodDescriptor({
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
// TODO: some method descriptors should parse inputs via `safeParse` whereas
// others should parse via `passthrough`. for example, eth_syncing should
// parse via `safeParse` since various clients return different types for
// this method. for example geth adds
// GETH: {
//   "jsonrpc": "2.0",
//   "id": 1,
//   "result": {
//     "currentBlock": "0x3cf522",
//     "healedBytecodeBytes": "0x0",
//     "healedBytecodes": "0x0",
//     "healedTrienodes": "0x0",
//     "healingBytecode": "0x0",
//     "healingTrienodes": "0x0",
//     "highestBlock": "0x3e0e41",
//     "startingBlock": "0x3cbed5",
//     "syncedAccountBytes": "0x0",
//     "syncedAccounts": "0x0",
//     "syncedBytecodeBytes": "0x0",
//     "syncedBytecodes": "0x0",
//     "syncedStorage": "0x0",
//     "syncedStorageBytes": "0x0"
//   }
// }
//
// BESU: {
//   "jsonrpc": "2.0",
//   "id": 51,
//   "result": {
//     "startingBlock": "0x0",
//     "currentBlock": "0x1518",
//     "highestBlock": "0x9567a3",
//     "pulledStates": "0x203ca",
//     "knownStates": "0x200636"
//   }
// }

export const eth_coinbase = new MethodDescriptor({
  method: "eth_coinbase",
  params: NoParams,
  result: Address,
});
// TODO: should we even support this method? We're not a node,
// and nobody is mining anything

export const eth_chainId = new MethodDescriptor({
  method: "eth_chainId",
  params: NoParams,
  result: Quantity,
}).setCannedResponse(({ chain }) => {
  const chainIdBigNumber = BigNumber.from(chain.chainId);

  return Quantity.parse(chainIdBigNumber.toHexString());
});

export const eth_mining = new MethodDescriptor({
  method: "eth_mining",
  params: NoParams,
  result: z.boolean(),
});
// TODO: should there be a method override for this, instead of caching
// or actual forwarding?

export const eth_hashrate = new MethodDescriptor({
  method: "eth_hashrate",
  params: NoParams,
  result: Quantity,
});
// TODO: should there be a method override for this, instead of caching
// or actual forwarding?

export const eth_gasPrice = new MethodDescriptor({
  method: "eth_gasPrice",
  params: NoParams,
  result: Quantity,
}).setCacheConfig({
  ttl: ({ chain }) => {
    return chain.blockTime;
  },
  paramsKeySuffix: "",
});

export const eth_accounts = new MethodDescriptor({
  method: "eth_accounts",
  params: NoParams,
  result: z.array(Address),
});
// TODO: should there be a method override for this, instead of caching
// or actual forwarding?

export const eth_blockNumber = new MethodDescriptor({
  method: "eth_blockNumber",
  params: NoParams,
  result: Quantity,
}).setCacheConfig({
  ttl: ({ chain }) => {
    return chain.blockTime * 1_000;
  },
  paramsKeySuffix: "",
});

export const eth_getBalance = new MethodDescriptor({
  method: "eth_getBalance",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Quantity,
}).setCacheConfig({
  ttl: ({ chain, params, highestKnownBlockNumber }) => {
    const [_address, blockNumber] = params;

    return ttlFromBlockNumberOrTag({
      chain,
      blockNumberOrTag: blockNumber,
      highestKnownBlockNumber,
    });
  },
  paramsKeySuffix: ({ params }) => {
    const [address, blockNumber] = params;

    return `${address}-${blockNumber}`;
  },
});

export const eth_getStorageAt = new MethodDescriptor({
  method: "eth_getStorageAt",
  params: z.tuple([Address, Quantity, BlockNumberOrTag]),
  result: Bytes,
}).setCacheConfig({
  ttl: ({ chain, params, highestKnownBlockNumber }) => {
    const [_address, _position, blockNumber] = params;

    return ttlFromBlockNumberOrTag({
      chain,
      blockNumberOrTag: blockNumber,
      highestKnownBlockNumber,
    });
  },
  paramsKeySuffix: ({ params }) => {
    const [address, position, blockNumber] = params;

    return `${address}-${position}-${blockNumber}`;
  },
});

export const eth_getTransactionCount = new MethodDescriptor({
  method: "eth_getTransactionCount",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Quantity,
}).setCacheConfig({
  ttl: ({ chain, params, highestKnownBlockNumber }) => {
    const [_address, blockNumber] = params;

    return ttlFromBlockNumberOrTag({
      chain,
      blockNumberOrTag: blockNumber,
      highestKnownBlockNumber,
    });
  },
  paramsKeySuffix: ({ params }) => {
    const [address, blockNumber] = params;

    return `${address}-${blockNumber}`;
  },
});

export const eth_getBlockTransactionCountByHash = new MethodDescriptor({
  method: "eth_getBlockTransactionCountByHash",
  params: z.tuple([Bytes32]),
  result: Quantity,
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [blockHash] = params;

    return `${blockHash}`;
  },
});

export const eth_getBlockTransactionCountByNumber = new MethodDescriptor({
  method: "eth_getBlockTransactionCountByNumber",
  params: z.tuple([BlockNumberOrTag]),
  result: Quantity,
}).setCacheConfig({
  ttl: ({ chain, params, highestKnownBlockNumber }) => {
    const [blockNumber] = params;

    return ttlFromBlockNumberOrTag({
      chain,
      blockNumberOrTag: blockNumber,
      highestKnownBlockNumber,
    });
  },
  paramsKeySuffix: ({ params }) => {
    const [blockNumber] = params;

    return `${blockNumber}`;
  },
});

export const eth_getUncleCountByBlockHash = new MethodDescriptor({
  method: "eth_getUncleCountByBlockHash",
  params: z.tuple([Bytes32]),
  result: Quantity,
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [blockHash] = params;

    return `${blockHash}`;
  },
});

export const eth_getUncleCountByBlockNumber = new MethodDescriptor({
  method: "eth_getUncleCountByBlockNumber",
  params: z.tuple([BlockNumberOrTag]),
  result: Quantity,
}).setCacheConfig({
  ttl: ({ chain, params, highestKnownBlockNumber }) => {
    const [blockNumber] = params;

    return ttlFromBlockNumberOrTag({
      chain,
      blockNumberOrTag: blockNumber,
      highestKnownBlockNumber,
    });
  },
  paramsKeySuffix: ({ params }) => {
    const [blockNumber] = params;

    return `${blockNumber}`;
  },
});

export const eth_getCode = new MethodDescriptor({
  method: "eth_getCode",
  params: z.tuple([Address, BlockNumberOrTag]),
  result: Bytes,
}).setCacheConfig({
  ttl: ({ chain, params, highestKnownBlockNumber }) => {
    const [_address, blockNumber] = params;

    return ttlFromBlockNumberOrTag({
      chain,
      blockNumberOrTag: blockNumber,
      highestKnownBlockNumber,
    });
  },
  paramsKeySuffix: ({ params }) => {
    const [address, blockNumber] = params;

    return `${address}-${blockNumber}`;
  },
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_sign = new MethodDescriptor({
  method: "eth_sign",
  params: z.tuple([Address, Bytes]),
  result: Bytes,
});
// TODO: should we support this method? it assumes the private key is held by the node

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_signTransaction = new MethodDescriptor({
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
export const eth_sendTransaction = new MethodDescriptor({
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

export const eth_sendRawTransaction = new MethodDescriptor({
  method: "eth_sendRawTransaction",
  params: z.tuple([Bytes]),
  result: Bytes32,
});

export const eth_call = new MethodDescriptor({
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
}).setCacheConfig({
  ttl: ({ chain, params, highestKnownBlockNumber }) => {
    const [_transactionCall, blockNumber] = params;

    return ttlFromBlockNumberOrTag({
      chain,
      blockNumberOrTag: blockNumber,
      highestKnownBlockNumber,
    });
  },
  paramsKeySuffix: ({ params }) => {
    const [transactionCall, blockNumber] = params;
    const { from, to, value, input } = transactionCall;

    let preBlockNumber = input ? `${input}` : undefined;

    if (preBlockNumber) {
      const f = from ? `${from}` : "";
      const t = `${to}`;
      const v = value ? `${value}` : "";

      preBlockNumber = `f:${f}-t:${t}-v:${v}`;
    }

    return `${preBlockNumber}-${blockNumber}`;
  },
});

export const eth_estimateGas = new MethodDescriptor({
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
}).setCacheConfig({
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [transactionCall] = params;
    const { from, to, value, input } = transactionCall;

    let preBlockNumber = input ? `${input}` : undefined;

    if (preBlockNumber) {
      const f = from ? `${from}` : "";
      const t = `${to}`;
      const v = value ? `${value}` : "";

      preBlockNumber = `f:${f}-t:${t}-v:${v}`;
    }

    return `${preBlockNumber}`;
  },
});

// TODO: MARK AS UNSUPPORTED OR ACTUALLY IMPLEMENT!
export const eth_feeHistory = new MethodDescriptor({
  method: "eth_feeHistory",
  params: z.unknown(),
  result: z.unknown(),
});

export const eth_getBlockByHash = new MethodDescriptor({
  method: "eth_getBlockByHash",
  // TODO: is the boolean field actually nullable?
  params: z.union([
    z.tuple([Bytes32]),
    z.tuple([Bytes32, z.boolean().nullish()]),
  ]),
  result: Block.nullish(),
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [blockHash, includeTransactions] = params;

    return `${blockHash}-${includeTransactions}`;
  },
});

export const eth_getBlockByNumber = new MethodDescriptor({
  method: "eth_getBlockByNumber",
  params: z.union([
    z.tuple([BlockNumberOrTag]),
    z.tuple([Bytes32, z.boolean().nullish()]),
  ]),
  result: Block.nullish(),
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [blockNumber, includeTransactions] = params;

    return `${blockNumber}-${includeTransactions}`;
  },
});

export const eth_getTransactionByHash = new MethodDescriptor({
  method: "eth_getTransactionByHash",
  params: z.tuple([Bytes32]),
  result: MaybePendingTransaction.nullable(),
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  // TODO: in this particular case, pending transactions
  // should only be cached for a single block.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [transactionHash] = params;

    return `${transactionHash}`;
  },
});

export const eth_getTransactionByBlockHashAndIndex = new MethodDescriptor({
  method: "eth_getTransactionByBlockHashAndIndex",
  params: z.tuple([Bytes32, Quantity]),
  result: MaybePendingTransaction.nullable(),
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  // TODO: in this particular case, pending transactions
  // should only be cached for a single block.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [blockHash, transactionIndex] = params;

    return `${blockHash}-${transactionIndex}`;
  },
});

export const eth_getTransactionByBlockNumberAndIndex = new MethodDescriptor({
  method: "eth_getTransactionByBlockNumberAndIndex",
  params: z.tuple([BlockNumberOrTag, Quantity]),
  result: MaybePendingTransaction.nullable(),
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  // TODO: in this particular case, pending transactions
  // should only be cached for a single block.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [blockNumber, transactionIndex] = params;

    return `${blockNumber}-${transactionIndex}`;
  },
});

export const eth_getTransactionReceipt = new MethodDescriptor({
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
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  // TODO: in this particular case, pending transactions
  // should only be cached for a single block.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [transactionHash] = params;

    return `${transactionHash}`;
  },
});

export const eth_getUncleByBlockHashAndIndex = new MethodDescriptor({
  method: "eth_getUncleByBlockHashAndIndex",
  params: z.tuple([Bytes32, Quantity]),
  result: Block.nullish(),
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [blockHash, uncleIndex] = params;

    return `${blockHash}-${uncleIndex}`;
  },
});

export const eth_getUncleByBlockNumberAndIndex = new MethodDescriptor({
  method: "eth_getUncleByBlockNumberAndIndex",
  params: z.tuple([BlockNumberOrTag, Quantity]),
  result: Block.nullish(),
}).setCacheConfig({
  // TODO: TTL should actually have access to the result,
  // for example, if the result is null, we should cache
  // for maybe just a single block. otherwise, we should
  // cache for infinity.
  ttl: ({ chain }) => chain.blockTime * 1000,
  paramsKeySuffix: ({ params }) => {
    const [blockNumber, uncleIndex] = params;

    return `${blockNumber}-${uncleIndex}`;
  },
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newFilter = new MethodDescriptor({
  method: "eth_newFilter",
  params: z.tuple([FilterInput]),
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newBlockFilter = new MethodDescriptor({
  method: "eth_newBlockFilter",
  params: NoParams,
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_newPendingTransactionFilter = new MethodDescriptor({
  method: "eth_newPendingTransactionFilter",
  params: NoParams,
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_uninstallFilter = new MethodDescriptor({
  method: "eth_uninstallFilter",
  params: z.tuple([Quantity]),
  result: z.boolean(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getFilterChanges = new MethodDescriptor({
  method: "eth_getFilterChanges",
  params: z.tuple([Quantity]),
  result: z.array(z.unknown()),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getFilterLogs = new MethodDescriptor({
  method: "eth_getFilterLogs",
  params: z.tuple([Quantity]),
  result: z.array(z.unknown()),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getLogs = new MethodDescriptor({
  method: "eth_getLogs",
  params: z.tuple([FilterInput]),
  result: z.array(z.unknown()),
});
// TODO: add proper caching logic

// TODO: research method and see how it should be supported
export const eth_getWork = new MethodDescriptor({
  method: "eth_getWork",
  params: NoParams,
  result: z.tuple([Bytes32, Bytes32, Bytes32]),
});

// TODO: research method and see how it should be supported
export const eth_submitWork = new MethodDescriptor({
  method: "eth_submitWork",
  params: z.tuple([Bytes8, Bytes32, Bytes32]),
  result: z.boolean(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_getCompilers = new MethodDescriptor({
  method: "eth_getCompilers",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileSolidity = new MethodDescriptor({
  method: "eth_compileSolidity",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileLLL = new MethodDescriptor({
  method: "eth_compileLLL",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
export const eth_compileSerpent = new MethodDescriptor({
  method: "eth_compileSerpent",
  params: z.unknown(),
  result: z.unknown(),
});

// // TODO: research method and see how it should be supported
export const eth_submitHashrate = new MethodDescriptor({
  method: "eth_submitHashrate",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: read other JSON-RPC specs and see if there are any other methods
