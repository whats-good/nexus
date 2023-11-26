import type { NetworkDescriptors } from "../chain/chain-registry";
import { ChainRegistry } from "../chain/chain-registry";
import type { ServiceProviderDescriptors } from "../service-provider/service-provider-registry";
import { ServiceProviderRegistry } from "../service-provider/service-provider-registry";

// TODO: add block explorer urls
// TODO: add localhost support
// TODO: add a "name" field to the chain and network descriptors for human reading.
export const networkDescriptors: NetworkDescriptors = {
  ethereum: {
    aliases: ["eth"],
    chains: {
      mainnet: {
        chainId: 1,
      },
      ropsten: {
        chainId: 3,
        isDeprecated: true,
      },
      rinkeby: {
        chainId: 4,
        isDeprecated: true,
      },
      goerli: {
        chainId: 5,
      },
      kovan: {
        chainId: 42,
        isDeprecated: true,
      },
      sepolia: {
        chainId: 11155111,
      },
    },
  },
  local: {
    chains: {
      hardhat: {
        chainId: 31337,
      },
      foundry: {
        chainId: 31337,
      },
    },
  },
  base: {
    chains: {
      mainnet: {
        chainId: 8453,
      },
      goerli: {
        chainId: 84531,
      },
      sepolia: {
        chainId: 84532,
      },
    },
  },
  polygon: {
    chains: {
      mumbai: {
        chainId: 80001,
      },
    },
  },
};

export const serviceProviderDescriptors: ServiceProviderDescriptors = {
  local: {
    supportedChains: {
      31337: {
        type: "url",
        url: "http://localhost:8545",
      },
    },
  },
  ankr: {
    envSecretKeyName: "NEXUS_ANKR_KEY",
    supportedChains: {
      1: {
        type: "url-append-key",
        baseURL: "https://rpc.ankr.com/eth",
      },
      5: {
        type: "url-append-key",
        baseURL: "https://rpc.ankr.com/eth_goerli",
      },
      11155111: {
        type: "url-append-key",
        baseURL: "https://rpc.ankr.com/eth_sepolia",
      },
      80001: {
        type: "url-append-key",
        baseURL: "https://rpc.ankr.com/polygon_mumbai",
      },
      84531: {
        type: "url-append-key",
        baseURL: "https://rpc.ankr.com/base_goerli",
      },
    },
  },
  alchemy: {
    envSecretKeyName: "NEXUS_ALCHEMY_KEY",
    supportedChains: {
      1: {
        type: "url-append-key",
        baseURL: "https://eth-mainnet.alchemyapi.io/v2",
      },
      5: {
        type: "url-append-key",
        baseURL: "https://eth-goerli.alchemyapi.io/v2",
      },
      11155111: {
        type: "url-append-key",
        baseURL: "https://eth-sepolia.alchemyapi.io/v2",
      },
      80001: {
        type: "url-append-key",
        baseURL: "https://polygon-mumbai.alchemyapi.io/v2",
      },
      84531: {
        type: "url-append-key",
        baseURL: "https://base-goerli.g.alchemy.com/v2",
      },
    },
  },
  base: {
    supportedChains: {
      8453: {
        type: "url",
        url: "https://mainnet.base.org",
        isProduction: false,
      },
      84531: {
        type: "url",
        url: "https://goerli.base.org",
        isProduction: false,
      },
      84532: {
        type: "url",
        url: "https://sepolia.base.org",
      },
    },
  },
  infura: {
    envSecretKeyName: "NEXUS_INFURA_KEY",
    supportedChains: {
      1: {
        type: "url-append-key",
        baseURL: "https://mainnet.infura.io/v3",
      },
      5: {
        type: "url-append-key",
        baseURL: "https://goerli.infura.io/v3",
      },
      11155111: {
        type: "url-append-key",
        baseURL: "https://sepolia.infura.io/v3",
      },
      80001: {
        type: "url-append-key",
        baseURL: "https://polygon-mumbai.infura.io/v3",
      },
    },
  },
};

export const defaultServiceProviderRegistry = new ServiceProviderRegistry(
  serviceProviderDescriptors
);

export const defaultChainRegistry = new ChainRegistry(networkDescriptors);
