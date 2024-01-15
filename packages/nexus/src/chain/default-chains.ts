import { Chain } from "./chain";

export const EthMainnet = new Chain({
  name: "ETH Mainnet",
  chainId: 1,
  blockTime: 12,
});
export const EthSepolia = new Chain({
  name: "ETH Sepolia",
  chainId: 11155111,
  blockTime: 12,
});

export const BaseMainnet = new Chain({
  name: "Base Mainnet",
  chainId: 8453,
  blockTime: 2,
});
export const BaseSepolia = new Chain({
  name: "Base Sepolia",
  chainId: 84532,
  blockTime: 2,
});

export const LocalChain = new Chain({
  name: "Local Chain",
  chainId: 31337,
  blockTime: 0, //
});
