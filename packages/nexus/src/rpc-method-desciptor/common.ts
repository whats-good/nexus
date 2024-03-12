import * as z from "zod";

// We're using this _Address.or(_Address) hack to work around a bug in zod, where branded type inference is lost otherwise.

const _Address = z
  .string()
  .refine((x) => /^0x[0-9a-fA-F]{40}$/.test(x))
  .brand("Address");

export const Address = _Address.or(_Address);

export type Address = z.infer<typeof Address>;

const _Quantity = z
  .string()
  .refine((x) => /^0x(?:[1-9a-f]+[0-9a-f]*|0)$/i.test(x))
  .brand("Quantity");

export const Quantity = _Quantity.or(_Quantity);

export type Quantity = z.infer<typeof Quantity>;

const _Bytes256 = z
  .string()
  .refine((x) => /^0x[0-9a-f]{512}$/.test(x))
  .brand("Bytes256");

export const Bytes256 = _Bytes256.or(_Bytes256);
export type Bytes256 = z.infer<typeof Bytes256>;

const _Bytes32 = z
  .string()
  .refine((x) => /^0x[0-9a-f]{64}$/.test(x))
  .brand("Bytes32");

export const Bytes32 = _Bytes32.or(_Bytes32);
export type Bytes32 = z.infer<typeof Bytes32>;

const _Bytes8 = z
  .string()
  .refine((x) => /^0x[0-9a-f]{16}$/.test(x))
  .brand("Bytes8");

export const Bytes8 = _Bytes8.or(_Bytes8);
export type Bytes8 = z.infer<typeof Bytes8>;

const _Bytes60 = z
  .string()
  .refine((x) => /^0x[0-9a-f]{120}$/.test(x))
  .brand("Bytes60");

export const Bytes60 = _Bytes60.or(_Bytes60);
export type Bytes60 = z.infer<typeof Bytes60>;

const _Bytes = z
  .string()
  .startsWith("0x")
  .refine((x) => x.length % 2 === 0)
  .brand("Bytes");

export const Bytes = _Bytes.or(_Bytes);
export type Bytes = z.infer<typeof Bytes>;

export const BlockTag = z.union([
  z.literal("earliest"),
  z.literal("latest"),
  z.literal("pending"),
  z.literal("safe"),
  z.literal("finalized"),
]);
export type BlockTag = z.infer<typeof BlockTag>;

export const BlockNumberOrTag = z.union([Quantity, BlockTag]);
export type BlockNumberOrTag = z.infer<typeof BlockNumberOrTag>;

export const NoParams = z.tuple([]).nullish();

export const MaybePendingTransaction = z.object({
  blockHash: Bytes32.nullish(),
  blockNumber: Bytes32.nullish(),
  transactionIndex: Quantity.nullish(),
  to: Address.nullish(),
  from: Address,
  gas: Quantity,
  gasPrice: Quantity,
  hash: Bytes32,
  input: Bytes,
  nonce: Quantity,
  value: Quantity,
  v: Quantity,
  r: Quantity,
  s: Quantity,
});

export const NonPendingTransaction = MaybePendingTransaction.merge(
  z.object({
    blockHash: Bytes32,
    blockNumber: Quantity,
    transactionIndex: Quantity,
  })
);

export const Block = z.object({
  number: Quantity,
  hash: Bytes32,
  parentHash: Bytes32,
  nonce: Bytes8,
  sha3Uncles: Bytes32,
  logsBloom: Bytes256,
  transactionsRoot: Bytes32,
  stateRoot: Bytes32,
  miner: Address,
  difficulty: Quantity,
  totalDifficulty: Quantity,
  extraData: Bytes,
  size: Quantity,
  gasLimit: Quantity,
  gasUsed: Quantity,
  timestamp: Quantity,
  transactions: z.union([z.array(Bytes32), z.array(NonPendingTransaction)]),
  uncles: z.array(Bytes32),
});
export type Block = z.infer<typeof Block>;

export const FilterTopic = z.union([Bytes32, z.array(Bytes32)]).nullable();
export const FilterInput = z.object({
  fromBlock: BlockNumberOrTag.optional(),
  toBlock: BlockNumberOrTag.optional(),
  addres: z.union([Address, z.array(Address)]).optional(),
  topics: z.union([FilterTopic, z.array(FilterTopic)]).optional(),
  blockHash: Bytes32.optional(),
});
