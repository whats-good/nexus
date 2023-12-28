import { Registry } from "./registry";

export const createDefaultRegistry = () => {
  const defaultRegistry = new Registry();

  // TODO: cleanup the builder api. make it immutable.

  defaultRegistry
    .network("ethereum", ["eth"])
    .chain({ chainId: 1, name: "mainnet", blockTime: 12 })
    .chain({ chainId: 4, name: "rinkeby", blockTime: 15 })
    .chain({ chainId: 5, name: "goerli", blockTime: 15 })
    .chain({ chainId: 11155111, name: "sepolia", blockTime: 14 })

    .network("base")
    .chain({ chainId: 8453, name: "mainnet", blockTime: 2 })
    .chain({ chainId: 84531, name: "goerli", blockTime: 2 })
    .chain({ chainId: 84532, name: "sepolia", blockTime: 2 })

    .network("polygon")
    .chain({ chainId: 80001, name: "mumbai", blockTime: 2 })

    .network("local", ["hardhat", "foundry"])
    .chain({ chainId: 31337, name: "local", blockTime: 0 });
  // forge/foundry and hardhat can be both run in instant mode or block-time mode.
  // if you want this configured, you should use your own registry.

  // TODO: make block times dynamic by actually querying the network and seeing the
  // average block time over the last 100 blocks or something.

  defaultRegistry
    .provider("alchemy")
    .support(1, {
      baseURL: "https://eth-mainnet.alchemyapi.io/v2",
      type: "url-append-key",
    })
    .support(5, {
      baseURL: "https://eth-goerli.alchemyapi.io/v2",
      type: "url-append-key",
    })
    .support(11155111, {
      baseURL: "https://eth-sepolia.alchemyapi.io/v2",
      type: "url-append-key",
    })
    .support(80001, {
      baseURL: "https://polygon-mumbai.alchemyapi.io/v2",
      type: "url-append-key",
    })
    .support(84531, {
      baseURL: "https://base-goerli.g.alchemy.com/v2",
      type: "url-append-key",
    })
    .support(84532, {
      baseURL: "https://base-sepolia.g.alchemy.com/v2",
      type: "url-append-key",
    })

    .provider("base")
    .support(8453, {
      type: "url",
      url: "https://mainnet.base.org",
      // isProduction: false,
    })
    .support(84531, {
      type: "url",
      url: "https://goerli.base.org",
      // isProduction: false,
    })
    .support(84532, {
      type: "url",
      url: "https://sepolia.base.org",
    })

    .provider("infura")
    .support(1, {
      type: "url-append-key",
      baseURL: "https://mainnet.infura.io/v3",
    })
    .support(5, {
      type: "url-append-key",
      baseURL: "https://goerli.infura.io/v3",
    })
    .support(11155111, {
      type: "url-append-key",
      baseURL: "https://sepolia.infura.io/v3",
    })
    .support(80001, {
      type: "url-append-key",
      baseURL: "https://polygon-mumbai.infura.io/v3",
    })

    .provider("ankr")
    .support(1, {
      type: "url-append-key",
      baseURL: "https://rpc.ankr.com/eth",
    })
    .support(5, {
      type: "url-append-key",
      baseURL: "https://rpc.ankr.com/eth_goerli",
    })
    .support(11155111, {
      type: "url-append-key",
      baseURL: "https://rpc.ankr.com/eth_sepolia",
    })
    .support(80001, {
      type: "url-append-key",
      baseURL: "https://rpc.ankr.com/polygon_mumbai",
    })
    .support(84531, {
      type: "url-append-key",
      baseURL: "https://rpc.ankr.com/base_goerli",
    });

  defaultRegistry.provider("hardhat").support(31337, {
    type: "url",
    url: "http://localhost:8545",
  });

  defaultRegistry.provider("foundry").support(31337, {
    type: "url",
    url: "http://localhost:8545",
  });

  return defaultRegistry;
};
