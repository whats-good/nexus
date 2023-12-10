import { Registry } from "./registry";

export const createDefaultRegistry = () => {
  const defaultRegistry = new Registry();

  defaultRegistry
    .network("ethereum", ["eth"])
    .chain(1, "mainnet")
    .chain(4, "rinkeby")
    .chain(5, "goerli")
    .chain(11155111, "sepolia")

    .network("base")
    .chain(8453, "mainnet")
    .chain(84531, "goerli")
    .chain(84532, "sepolia")

    .network("polygon")
    .chain(80001, "mumbai")

    .network("local", ["hardhat", "foundry"])
    .chain(31337, "local");

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

  return defaultRegistry;
};
