import { CHAIN } from "@src/chain";
import { ServiceProviderBuilder } from "./service-provider-builder";

export const alchemy = new ServiceProviderBuilder("alchemy")
  .addChainSupport({
    kind: "key-appended-url",
    chain: CHAIN.EthMainnet,
    baseURL: "https://eth-mainnet.alchemyapi.io/v2",
  })
  .addChainSupport({
    kind: "key-appended-url",
    chain: CHAIN.EthSepolia,
    baseURL: "https://eth-sepolia.alchemyapi.io/v2",
  })
  .addChainSupport({
    kind: "key-appended-url",
    chain: CHAIN.BaseMainnet,
    baseURL: "https://base-mainnet.g.alchemy.com/v2",
  })
  .addChainSupport({
    kind: "key-appended-url",
    chain: CHAIN.BaseSepolia,
    baseURL: "https://base-sepolia.g.alchemy.com/v2",
  });

export const base = new ServiceProviderBuilder("base")
  .addChainSupport({
    kind: "pure-url",
    chain: CHAIN.BaseMainnet,
    url: "https://mainnet.base.org",
  })
  .addChainSupport({
    kind: "pure-url",
    chain: CHAIN.EthSepolia,
    url: "https://sepolia.base.org",
  });

export const infura = new ServiceProviderBuilder("infura")
  .addChainSupport({
    kind: "key-appended-url",
    chain: CHAIN.EthMainnet,
    baseURL: "https://mainnet.infura.io/v3",
  })
  .addChainSupport({
    kind: "key-appended-url",
    chain: CHAIN.EthSepolia,
    baseURL: "https://sepolia.infura.io/v3",
  });

export const ankr = new ServiceProviderBuilder("ankr")
  .addChainSupport({
    kind: "key-appended-url",
    chain: CHAIN.EthMainnet,
    baseURL: "https://rpc.ankr.com/eth",
  })
  .addChainSupport({
    kind: "key-appended-url",
    chain: CHAIN.EthSepolia,
    baseURL: "https://rpc.ankr.com/eth_sepolia",
  });

export const hardhat = new ServiceProviderBuilder("hardhat").addChainSupport({
  kind: "pure-url",
  chain: CHAIN.LocalChain,
  url: "http://localhost:8545",
});

export const foundry = new ServiceProviderBuilder("foundry").addChainSupport({
  kind: "pure-url",
  chain: CHAIN.LocalChain,
  url: "http://localhost:8545",
});
