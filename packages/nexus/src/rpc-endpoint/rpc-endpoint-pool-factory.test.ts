import { describe, expect, it } from "vitest";
import { defaultMethodDescriptorRegistry } from "@src/method-descriptor/default-method-descriptor-registry";
import { RpcRequestCache } from "@src/cache";
import { PlacholderCache } from "@src/cache/placeholder-cache";
import { createDefaultRegistry } from "../registry/default-registry";
import { Config } from "../config";
import { RpcEndpointPoolFactory } from "./rpc-endpoint-pool-factory";

describe("provider factory", () => {
  const config = new Config({
    chains: [1, 84531, 5],
    providers: [
      "base",
      {
        name: "alchemy",
        key: "key-1",
      },
      {
        name: "infura",
        key: "key-2",
      },
    ],
  });

  const cache = new RpcRequestCache(
    config,
    defaultMethodDescriptorRegistry,
    new PlacholderCache()
  );

  const factory = new RpcEndpointPoolFactory(config, cache);

  const registry = createDefaultRegistry();

  const chains = {
    ethMainnet: registry.getChainByNames("ethereum", "mainnet"),
    baseGoerli: registry.getChainByNames("base", "goerli"),
    rinkeby: registry.getChainByNames("ethereum", "rinkeby"),
  };
  const providers = {
    alchemy: registry.getServiceProviderByName("alchemy"),
    infura: registry.getServiceProviderByName("infura"),
    ankr: registry.getServiceProviderByName("ankr"),
    base: registry.getServiceProviderByName("base"),
  };

  describe("routes", () => {
    describe("happy path", () => {
      it("eth-mainnet", () => {
        const pool = factory.fromChain(chains.ethMainnet!);

        const firstResult = pool.current;

        pool.advance();
        const secondResult = pool.current;

        pool.advance();
        const thirdResult = pool.current;

        expect(pool).toMatchObject({
          chain: chains.ethMainnet,
          eligibleServiceProviders: expect.arrayContaining([
            providers.alchemy,
            providers.infura,
            providers.ankr,
          ]) as [],
          configuredServiceProviders: expect.arrayContaining([
            providers.alchemy,
            providers.infura,
          ]) as [],
        });

        expect([firstResult?.provider, secondResult?.provider]).toEqual(
          expect.arrayContaining([providers.alchemy, providers.infura])
        );

        expect(firstResult).not.toEqual(secondResult);

        expect(thirdResult).toBeUndefined();
      });

      it("base-goerli", () => {
        const pool = factory.fromChain(chains.baseGoerli!);

        const firstResult = pool.current;

        pool.advance();
        const secondResult = pool.current;

        pool.advance();
        const thirdResult = pool.current;

        expect(pool).toMatchObject({
          chain: chains.baseGoerli,
          eligibleServiceProviders: expect.arrayContaining([
            providers.base,
            providers.alchemy,
            providers.ankr,
          ]) as [],
          configuredServiceProviders: expect.arrayContaining([
            providers.base,
            providers.alchemy,
          ]) as [],
        });

        expect({
          results: [
            firstResult?.provider,
            secondResult?.provider,
            thirdResult?.provider,
          ],
        }).toMatchObject({
          results: expect.arrayContaining([
            providers.base,
            providers.alchemy,
            undefined,
          ]) as [],
        });
      });
    });

    describe("unhappy path", () => {
      it("unsupported chain", () => {
        const pool = factory.fromChain(chains.rinkeby!);

        expect(pool).toMatchObject({
          chain: chains.rinkeby,
          eligibleServiceProviders: [],
          configuredServiceProviders: [],
        });
      });
    });
  });
});
