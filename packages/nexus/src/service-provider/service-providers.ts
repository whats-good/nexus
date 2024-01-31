import { CHAIN } from "@src/chain";
import { ServiceProvider } from "./service-provider";

export const alchemy = new ServiceProvider("alchemy");
alchemy.addChainSupport({
  kind: "key-appended-url",
  chain: CHAIN.EthMainnet,
  baseURL: "https://eth-mainnet.alchemyapi.io/v2",
});
alchemy.addChainSupport({
  kind: "key-appended-url",
  chain: CHAIN.EthSepolia,
  baseURL: "https://eth-sepolia.alchemyapi.io/v2",
});
alchemy.addChainSupport({
  kind: "key-appended-url",
  chain: CHAIN.BaseMainnet,
  baseURL: "https://base-mainnet.g.alchemy.com/v2",
});
alchemy.addChainSupport({
  kind: "key-appended-url",
  chain: CHAIN.BaseSepolia,
  baseURL: "https://base-sepolia.g.alchemy.com/v2",
});

export const base = new ServiceProvider("base");
base.addChainSupport({
  kind: "pure-url",
  chain: CHAIN.BaseMainnet,
  url: "https://mainnet.base.org",
});
base.addChainSupport({
  kind: "pure-url",
  chain: CHAIN.EthSepolia,
  url: "https://sepolia.base.org",
});

export const infura = new ServiceProvider("infura");
infura.addChainSupport({
  kind: "key-appended-url",
  chain: CHAIN.EthMainnet,
  baseURL: "https://mainnet.infura.io/v3",
});
infura.addChainSupport({
  kind: "key-appended-url",
  chain: CHAIN.EthSepolia,
  baseURL: "https://sepolia.infura.io/v3",
});

export const ankr = new ServiceProvider("ankr");
ankr.addChainSupport({
  kind: "key-appended-url",
  chain: CHAIN.EthMainnet,
  baseURL: "https://rpc.ankr.com/eth",
});
ankr.addChainSupport({
  kind: "key-appended-url",
  chain: CHAIN.EthSepolia,
  baseURL: "https://rpc.ankr.com/eth_sepolia",
});

export const hardhat = new ServiceProvider("hardhat");
hardhat.addChainSupport({
  kind: "pure-url",
  chain: CHAIN.LocalChain,
  url: "http://localhost:8545",
});

export const foundry = new ServiceProvider("foundry");
foundry.addChainSupport({
  kind: "pure-url",
  chain: CHAIN.LocalChain,
  url: "http://localhost:8545",
});
