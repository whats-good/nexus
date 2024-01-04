/* eslint-disable camelcase -- Disabling the camelCase rule, because eth method names are snake_cased */

import { z } from "zod";
import { BigNumber } from "@ethersproject/bignumber";
import type { Chain } from "@src/chain";
import { MethodDescriptor } from "./method-descriptor";
import { MethodDescriptorRegistry } from "./method-descriptor-registry";
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

const web3_clientVersion = MethodDescriptor.init({
  name: "web3_clientVersion",
  params: NoParams,
  result: z.string(),
});
// .cache({
//   ttl: Number.POSITIVE_INFINITY,
//   paramsKeySuffix: null,
//   enabled: true,
// });
// TODO: how should this behave? should it keep the cache forever and
// just return a pre-defined value, e.g @whatsgood/nexus@0.0.1?

const web3_sha3 = MethodDescriptor.init({
  name: "web3_sha3",
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

const net_version = MethodDescriptor.init({
  name: "net_version",
  params: NoParams,
  result: z.string(),
});
// TODO: should we handle this via method overrides? since it just returns the
// chain id, which we already have access to.

const net_listening = MethodDescriptor.init({
  name: "net_listening",
  params: NoParams,
  result: z.boolean(),
});
// TODO: should we just not implement this method since we're
// just a proxy and the meaning of this method will change as
// soon as a different provider is hit behind the scenes?

const net_peerCount = MethodDescriptor.init({
  name: "net_peerCount",
  params: NoParams,
  result: Quantity,
});
// TODO: should we just not implement this method since we're just
// a proxy and the meaning of this method will change as soon as
// a different provider is hit behind the scenes?

const eth_protocolVersion = MethodDescriptor.init({
  name: "eth_protocolVersion",
  params: NoParams,
  result: z.string(),
});
// TODO: how should we cache this? should we cache it at all?
// should we just return a pre-defined value, e.g 0x40?

const eth_syncing = MethodDescriptor.init({
  name: "eth_syncing",
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

const eth_coinbase = MethodDescriptor.init({
  name: "eth_coinbase",
  params: NoParams,
  result: Address,
});
// TODO: should we even support this method? We're not a node,
// and nobody is mining anything

const eth_chainId = MethodDescriptor.init({
  name: "eth_chainId",
  params: NoParams,
  result: Quantity,
}).setCannedResponse(({ chain }) => {
  const chainIdBigNumber = BigNumber.from(chain.chainId);

  return Quantity.parse(chainIdBigNumber.toHexString());
});

const eth_mining = MethodDescriptor.init({
  name: "eth_mining",
  params: NoParams,
  result: z.boolean(),
});
// TODO: should there be a method override for this, instead of caching
// or actual forwarding?

const eth_hashrate = MethodDescriptor.init({
  name: "eth_hashrate",
  params: NoParams,
  result: Quantity,
});
// TODO: should there be a method override for this, instead of caching
// or actual forwarding?

const eth_gasPrice = MethodDescriptor.init({
  name: "eth_gasPrice",
  params: NoParams,
  result: Quantity,
}).setCacheConfig({
  ttl: ({ chain }) => chain.blockTime,
  paramsKeySuffix: null,
  enabled: true,
});

const eth_accounts = MethodDescriptor.init({
  name: "eth_accounts",
  params: NoParams,
  result: z.array(Address),
});
// TODO: should there be a method override for this, instead of caching
// or actual forwarding?

const eth_blockNumber = MethodDescriptor.init({
  name: "eth_blockNumber",
  params: NoParams,
  result: Quantity,
}).setCacheConfig({
  ttl: ({ chain }) => {
    return chain.blockTime * 1_000;
  },
  paramsKeySuffix: null,
  enabled: true,
});

const eth_getBalance = MethodDescriptor.init({
  name: "eth_getBalance",
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
  enabled: true,
});

const eth_getStorageAt = MethodDescriptor.init({
  name: "eth_getStorageAt",
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
  enabled: true,
});

const eth_getTransactionCount = MethodDescriptor.init({
  name: "eth_getTransactionCount",
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
  enabled: true,
});

const eth_getBlockTransactionCountByHash = MethodDescriptor.init({
  name: "eth_getBlockTransactionCountByHash",
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
  enabled: true,
});

const eth_getBlockTransactionCountByNumber = MethodDescriptor.init({
  name: "eth_getBlockTransactionCountByNumber",
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
  enabled: true,
});

const eth_getUncleCountByBlockHash = MethodDescriptor.init({
  name: "eth_getUncleCountByBlockHash",
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
  enabled: true,
});

const eth_getUncleCountByBlockNumber = MethodDescriptor.init({
  name: "eth_getUncleCountByBlockNumber",
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
  enabled: true,
});

const eth_getCode = MethodDescriptor.init({
  name: "eth_getCode",
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
  enabled: true,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_sign = MethodDescriptor.init({
  name: "eth_sign",
  params: z.tuple([Address, Bytes]),
  result: Bytes,
});
// TODO: should we support this method? it assumes the private key is held by the node

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_signTransaction = MethodDescriptor.init({
  name: "eth_signTransaction",
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
const eth_sendTransaction = MethodDescriptor.init({
  name: "eth_sendTransaction",
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

const eth_sendRawTransaction = MethodDescriptor.init({
  name: "eth_sendRawTransaction",
  params: z.tuple([Bytes]),
  result: Bytes32,
});

const eth_call = MethodDescriptor.init({
  name: "eth_call",
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
  enabled: true,
});

const eth_estimateGas = MethodDescriptor.init({
  name: "eth_estimateGas",
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
  enabled: true,
});

// TODO: MARK AS UNSUPPORTED OR ACTUALLY IMPLEMENT!
const eth_feeHistory = MethodDescriptor.init({
  name: "eth_feeHistory",
  params: z.unknown(),
  result: z.unknown(),
});

const eth_getBlockByHash = MethodDescriptor.init({
  name: "eth_getBlockByHash",
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
  enabled: true,
});

const eth_getBlockByNumber = MethodDescriptor.init({
  name: "eth_getBlockByNumber",
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
  enabled: true,
});

const eth_getTransactionByHash = MethodDescriptor.init({
  name: "eth_getTransactionByHash",
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
  enabled: true,
});

const eth_getTransactionByBlockHashAndIndex = MethodDescriptor.init({
  name: "eth_getTransactionByBlockHashAndIndex",
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
  enabled: true,
});

const eth_getTransactionByBlockNumberAndIndex = MethodDescriptor.init({
  name: "eth_getTransactionByBlockNumberAndIndex",
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
  enabled: true,
});

const eth_getTransactionReceipt = MethodDescriptor.init({
  name: "eth_getTransactionReceipt",
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
  enabled: true,
});

const eth_getUncleByBlockHashAndIndex = MethodDescriptor.init({
  name: "eth_getUncleByBlockHashAndIndex",
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
  enabled: true,
});

const eth_getUncleByBlockNumberAndIndex = MethodDescriptor.init({
  name: "eth_getUncleByBlockNumberAndIndex",
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
  enabled: true,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_newFilter = MethodDescriptor.init({
  name: "eth_newFilter",
  params: z.tuple([FilterInput]),
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_newBlockFilter = MethodDescriptor.init({
  name: "eth_newBlockFilter",
  params: NoParams,
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_newPendingTransactionFilter = MethodDescriptor.init({
  name: "eth_newPendingTransactionFilter",
  params: NoParams,
  result: Quantity,
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_uninstallFilter = MethodDescriptor.init({
  name: "eth_uninstallFilter",
  params: z.tuple([Quantity]),
  result: z.boolean(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_getFilterChanges = MethodDescriptor.init({
  name: "eth_getFilterChanges",
  params: z.tuple([Quantity]),
  result: z.array(z.unknown()),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_getFilterLogs = MethodDescriptor.init({
  name: "eth_getFilterLogs",
  params: z.tuple([Quantity]),
  result: z.array(z.unknown()),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_getLogs = MethodDescriptor.init({
  name: "eth_getLogs",
  params: z.tuple([FilterInput]),
  result: z.array(z.unknown()),
});
// TODO: add proper caching logic

// TODO: research method and see how it should be supported
const eth_getWork = MethodDescriptor.init({
  name: "eth_getWork",
  params: NoParams,
  result: z.tuple([Bytes32, Bytes32, Bytes32]),
});

// TODO: research method and see how it should be supported
const eth_submitWork = MethodDescriptor.init({
  name: "eth_submitWork",
  params: z.tuple([Bytes8, Bytes32, Bytes32]),
  result: z.boolean(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_getCompilers = MethodDescriptor.init({
  name: "eth_getCompilers",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_compileSolidity = MethodDescriptor.init({
  name: "eth_compileSolidity",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_compileLLL = MethodDescriptor.init({
  name: "eth_compileLLL",
  params: z.unknown(),
  result: z.unknown(),
});

// TODO: how should this be treated?
// should it always be relayed to the same provider?
// we should get back to these subscription methods later.
// TODO: maybe this method should be NOT SUPPORTED?
// TODO: or maybe the client should specify the provider?
const eth_compileSerpent = MethodDescriptor.init({
  name: "eth_compileSerpent",
  params: z.unknown(),
  result: z.unknown(),
});

// // TODO: research method and see how it should be supported
const eth_submitHashrate = MethodDescriptor.init({
  name: "eth_submitHashrate",
  params: z.unknown(),
  result: z.unknown(),
});

const methodDescriptors = [
  web3_clientVersion,
  web3_sha3,
  net_version,
  net_listening,
  net_peerCount,
  eth_protocolVersion,
  eth_syncing,
  eth_coinbase,
  eth_chainId,
  eth_mining,
  eth_hashrate,
  eth_gasPrice,
  eth_accounts,
  eth_blockNumber,
  eth_getBalance,
  eth_getStorageAt,
  eth_getTransactionCount,
  eth_getBlockTransactionCountByHash,
  eth_getBlockTransactionCountByNumber,
  eth_getUncleCountByBlockHash,
  eth_getUncleCountByBlockNumber,
  eth_getCode,
  eth_sign,
  eth_signTransaction,
  eth_sendTransaction,
  eth_sendRawTransaction,
  eth_call,
  eth_estimateGas,
  eth_feeHistory,
  eth_getBlockByHash,
  eth_getBlockByNumber,
  eth_getTransactionByHash,
  eth_getTransactionByBlockHashAndIndex,
  eth_getTransactionByBlockNumberAndIndex,
  eth_getTransactionReceipt,
  eth_getUncleByBlockHashAndIndex,
  eth_getUncleByBlockNumberAndIndex,
  eth_newFilter,
  eth_newBlockFilter,
  eth_newPendingTransactionFilter,
  eth_uninstallFilter,
  eth_getFilterChanges,
  eth_getFilterLogs,
  eth_getLogs,
  eth_getWork,
  eth_submitWork,
  eth_getCompilers,
  eth_compileSolidity,
  eth_compileLLL,
  eth_compileSerpent,
  eth_submitHashrate,
  eth_compileLLL,
] as const;

export const defaultMethodDescriptorRegistry = new MethodDescriptorRegistry(
  methodDescriptors
);

// TODO: read other JSON-RPC specs and see if there are any other methods
