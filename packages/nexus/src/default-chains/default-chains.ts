import { Chain } from "@src/chain";

export const ETHEREUM_MAINNET = new Chain({
  name: "Ethereum Mainnet",
  chainId: 1,
  blockTime: 12,
});

export const ETHEREUM_SEPOLIA = new Chain({
  name: "Ethereum Sepolia",
  chainId: 11155111,
  blockTime: 60,
});

export const BASE_MAINNET = new Chain({
  name: "Base Mainnet",
  chainId: 8453,
  blockTime: 2,
});

export const BASE_SEPOLIA = new Chain({
  name: "Base Sepolia",
  chainId: 84532,
  blockTime: 2,
});

export const OP_MAINNET = new Chain({
  name: "Op Mainnet",
  chainId: 10,
  blockTime: 2,
});

export const OP_SEPOLIA = new Chain({
  name: "Op Sepolia",
  chainId: 11155420,
  blockTime: 14,
});
