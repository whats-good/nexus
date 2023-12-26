import { describe, expect, it } from "vitest";
import { Chain, Network } from "@src/chain";
import { Config } from "@src/config";
import { Registry } from "./registry";

describe("registry", () => {
  describe("init apis", () => {
    it("should return undefined for unregistered networks", () => {
      const registry = new Registry();

      expect(registry.getNetwork("mainnet")).toBeUndefined();
    });

    it("should return registered networks", () => {
      const registry = new Registry();
      const eth = Network.init(registry, "ethereum");

      expect(registry.getNetwork("ethereum")).toEqual(eth);
    });

    it("should respect aliases", () => {
      const registry = new Registry();
      const eth = Network.init(registry, "ethereum", ["eth"]);

      expect(registry.getNetwork("ethereum")).toEqual(eth);
      expect(registry.getNetwork("eth")).toEqual(eth);
    });

    it("should not respect non-existing aliases", () => {
      const registry = new Registry();

      Network.init(registry, "ethereum", ["eth"]);

      expect(registry.getNetwork("ether")).toEqual(undefined);
    });

    it("should extend and override existing networks", () => {
      const registry = new Registry();

      const network1 = Network.init(registry, "ethereum");

      const network2 = Network.init(registry, "ethereum", ["eth"]);

      expect(network1).toEqual(network2);
      expect(registry.getNetwork("ethereum")).toEqual(network2);
      expect(registry.getNetwork("eth")).toEqual(network2);

      expect(registry.getNetwork("ethereum")).toEqual(network1);
      expect(registry.getNetwork("eth")).toEqual(network1);
    });

    it("should not retrieve unregistered chains", () => {
      const registry = new Registry();

      expect(registry.getChainById(1)).toBeUndefined();
      Network.init(registry, "ethereum");
      expect(registry.getChainById(1)).toBeUndefined();
    });

    it("should retrieve registered chains", () => {
      const registry = new Registry();
      const ethereum = Network.init(registry, "ethereum");
      const mainnet = Chain.init(registry, {
        chainId: 1,
        network: ethereum,
        name: "mainnet",
      });

      expect(registry.getChainById(1)).toEqual(mainnet);
    });

    it("should allow retrieving chains by network and name", () => {
      const registry = new Registry();
      const ethereum = Network.init(registry, "ethereum");
      const mainnet = Chain.init(registry, {
        chainId: 1,
        network: ethereum,
        name: "mainnet",
      });

      expect(registry.getChainByNames("ethereum", "mainnet")).toEqual(mainnet);
    });

    it("should allow retrieving chains by network and name post update", () => {
      const registry = new Registry();
      const ethereum = Network.init(registry, "ethereum");
      const mainnet = Chain.init(registry, {
        chainId: 1,
        network: ethereum,
        name: "mainnet",
      });

      expect(registry.getChainByNames("ethereum", "mainnet")).toEqual(mainnet);
      expect(registry.getChainByNames("eth", "mainnet")).toBeUndefined();

      Network.init(registry, "ethereum", ["eth"]);
      expect(registry.getChainByNames("eth", "mainnet")).toEqual(mainnet);
    });
  });

  describe("builder apis", () => {
    it("should return registered networks", () => {
      const registry = new Registry();

      registry.network("ethereum");
      expect(registry.getNetwork("ethereum")?.name).toEqual("ethereum");
    });

    it("should respect aliases", () => {
      const registry = new Registry();

      registry.network("ethereum", ["eth"]);
      expect(registry.getNetwork("eth")?.name).toEqual("ethereum");
    });

    it("should not respect non-existing aliases", () => {
      const registry = new Registry();

      registry.network("ethereum", ["eth"]);
      expect(registry.getNetwork("ether")).toBeUndefined();
    });

    it("should extend and override existing networks", () => {
      const registry = new Registry();

      registry.network("ethereum");
      expect(registry.getNetwork("ethereum")?.name).toEqual("ethereum");
      expect(registry.getNetwork("eth")).toBeUndefined();

      registry.network("ethereum", ["eth"]);
      expect(registry.getNetwork("eth")?.name).toEqual("ethereum");
    });

    it("should not retrieve unregistered chains", () => {
      const registry = new Registry();

      registry.network("ethereum");
      expect(registry.getChainById(1)).toBeUndefined();
    });

    it("should retrieve registered chains", () => {
      const registry = new Registry();

      registry.network("ethereum").chain(1, "mainnet");
      expect(registry.getChainById(1)?.name).toEqual("mainnet");
    });

    it("should allow retrieving chains by network and name", () => {
      const registry = new Registry();

      registry.network("ethereum").chain(1, "mainnet");
      expect(registry.getChainByNames("ethereum", "mainnet")?.name).toEqual(
        "mainnet"
      );
    });

    it("should allow retrieving chains by network and name post update", () => {
      const registry = new Registry();

      registry.network("ethereum").chain(1, "mainnet");
      expect(registry.getChainByNames("ethereum", "mainnet")?.name).toEqual(
        "mainnet"
      );
      expect(registry.getChainByNames("eth", "mainnet")).toBeUndefined();

      registry.network("ethereum", ["eth"]);

      expect(registry.getChainByNames("eth", "mainnet")?.name).toEqual(
        "mainnet"
      );
    });

    it("should not allow registering service providers to unregistered chains", () => {
      const registry = new Registry();

      expect(() =>
        registry.provider("alchemy").support(1, {
          type: "url-append-key",
          baseURL: "https://eth-mainnet.alchemyapi.io/v2/",
        })
      ).toThrowError("Chain 1 not registered");
    });

    it("should allow registering service providers to registered chains", () => {
      const registry = new Registry();

      registry.network("ethereum").chain(1, "mainnet");
      registry.provider("alchemy").support(1, {
        type: "url-append-key",
        baseURL: "https://eth-mainnet.alchemyapi.io/v2/",
      });
    });

    it("should allow retrieving service providers by chain and name", () => {
      const registry = new Registry();

      registry.network("ethereum").chain(1, "mainnet");
      registry
        .provider("alchemy")
        .support(1, {
          type: "url-append-key",
          baseURL: "https://eth-mainnet.alchemyapi.io/v2/",
        })
        .provider("infura")
        .support(1, {
          type: "url-append-key",
          baseURL: "https://mainnet.infura.io/v3/",
        });

      const chain = registry.getChainByNames("ethereum", "mainnet")!;

      expect(chain).toBeDefined();

      const alchemy = registry.getServiceProviderByName("alchemy");
      const infura = registry.getServiceProviderByName("infura");

      expect(alchemy).toBeDefined();
      expect(infura).toBeDefined();

      expect({
        providers: registry.getServiceProvidersSupportingChain(chain),
      }).toMatchObject({
        providers: expect.arrayContaining([alchemy, infura]) as [],
      });
    });

    it("provider.support should be idempotent from registry perspective", () => {
      const registry = new Registry();

      registry.network("ethereum").chain(1, "mainnet");
      registry.provider("alchemy").support(1, {
        baseURL: "https://first-url.com",
        type: "url-append-key",
      });
      const mainnet = registry.getChainByNames("ethereum", "mainnet")!;
      const alchemy = registry.getServiceProviderByName("alchemy")!;

      expect(mainnet).toBeDefined();
      expect(alchemy).toBeDefined();

      expect(registry.getServiceProvidersSupportingChain(mainnet)).toEqual([
        alchemy,
      ]);

      registry.provider("alchemy").support(1, {
        baseURL: "https://second-url.com",
        type: "url-append-key",
      });
      expect(registry.getServiceProvidersSupportingChain(mainnet)).toEqual([
        alchemy,
      ]);
    });

    it("should override existing service provider chain support", () => {
      const registry = new Registry();
      const config = new Config({
        registry,
        chains: [1],
        providers: [
          {
            name: "alchemy",
            key: "key-1",
          },
        ],
      });

      registry.network("ethereum").chain(1, "mainnet");
      registry.provider("alchemy").support(1, {
        baseURL: "https://first-url.com",
        type: "url-append-key",
      });
      const mainnet = registry.getChainByNames("ethereum", "mainnet")!;
      const alchemy = registry.getServiceProviderByName("alchemy")!;

      expect(mainnet).toBeDefined();
      expect(alchemy).toBeDefined();

      expect(registry.getServiceProvidersSupportingChain(mainnet)).toEqual([
        alchemy,
      ]);

      const endpointBefore = alchemy.getRpcEndpoint(mainnet, config);

      expect(endpointBefore?.url).toEqual("https://first-url.com/key-1");

      registry.provider("alchemy").support(1, {
        baseURL: "https://second-url.com",
        type: "url-append-key",
      });
      expect(registry.getServiceProvidersSupportingChain(mainnet)).toEqual([
        alchemy,
      ]);

      const endpointAfter = alchemy.getRpcEndpoint(mainnet, config);

      expect(endpointAfter?.url).toEqual("https://second-url.com/key-1");
    });

    // it("should return existing method descriptors when queried", () => {
    //   const registry1 = new Registry();
    //   const registry2 = registry1.methodDescriptor({
    //     name: "eth_blockNumber",
    //     params: [],
    //     result: z.number(),
    //   });

    //   const eth_blockNumber = registry2.methodDescriptorMap.eth_blockNumber;

    //   expect(eth_blockNumber).toBeDefined();
    // });

    // // TODO: add standalone tests to the method descriptors
  });
});
