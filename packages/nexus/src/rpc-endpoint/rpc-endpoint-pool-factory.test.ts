import { describe, expect, it } from "vitest";
import {
  defaultChainRegistry,
  defaultServiceProviderRegistry,
} from "../setup/data";
import { Config } from "../config";
import { RpcEndpointPoolFactory } from "./rpc-endpoint-pool-factory";

describe("provider factory", () => {
  const factory = new RpcEndpointPoolFactory({
    chainRegistry: defaultChainRegistry,
    serviceProviderRegistry: defaultServiceProviderRegistry,
    config: new Config({
      providers: {
        alchemy: {
          key: "key1",
        },
        infura: {
          key: "key2",
        },
      },
    }),
  });

  const chains = {
    ethMainnet: defaultChainRegistry.getChainByNames("ethereum", "mainnet"),
    baseGoerli: defaultChainRegistry.getChainByNames("base", "goerli"),
    rinkeby: defaultChainRegistry.getChainByNames("ethereum", "rinkeby"),
  };
  const providers = {
    alchemy: defaultServiceProviderRegistry.findOneByName("alchemy"),
    infura: defaultServiceProviderRegistry.findOneByName("infura"),
    ankr: defaultServiceProviderRegistry.findOneByName("ankr"),
    base: defaultServiceProviderRegistry.findOneByName("base"),
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
