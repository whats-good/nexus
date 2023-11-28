import { describe, expect, it } from "vitest";
import { defaultRegistry } from "../setup/data";
import { Config } from "../config";
import { RpcEndpointPoolFactory } from "./rpc-endpoint-pool-factory";

describe("provider factory", () => {
  const config = new Config({
    providers: [
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

  const factory = new RpcEndpointPoolFactory(config);

  const chains = {
    ethMainnet: defaultRegistry.getChainByNames("ethereum", "mainnet"),
    baseGoerli: defaultRegistry.getChainByNames("base", "goerli"),
    rinkeby: defaultRegistry.getChainByNames("ethereum", "rinkeby"),
  };
  const providers = {
    alchemy: defaultRegistry.getServiceProviderByName("alchemy"),
    infura: defaultRegistry.getServiceProviderByName("infura"),
    ankr: defaultRegistry.getServiceProviderByName("ankr"),
    base: defaultRegistry.getServiceProviderByName("base"),
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
