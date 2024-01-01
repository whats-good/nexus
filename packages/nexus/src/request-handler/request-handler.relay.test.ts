import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import type { ProviderConfigParam } from "@src/config";
import { Config } from "@src/config";
import { handlers } from "@test/mock-server-handlers";
import { retry } from "@test/utils";
import { defaultMethodDescriptorRegistry } from "@src/method-descriptor/default-method-descriptor-registry";
import { RpcRequestCache } from "@src/cache";
import { PlacholderCache } from "@src/cache/placeholder-cache";
import { Registry } from "../registry";
import { RequestHandler } from "./request-handler";

const sharedConfig = {
  globalAccessKey: "some-key",
  providers: [
    {
      name: "alchemy",
      key: "key-1",
    },
    {
      name: "infura",
      key: "key-2",
    },
    {
      name: "ankr",
      key: "key-3",
    },
  ] as [ProviderConfigParam, ...ProviderConfigParam[]],
};

const configWithCycleRecovery = new Config({
  ...sharedConfig,
  recoveryMode: "cycle",
  chains: [1],
});

const configWithNoRecovery = new Config({
  ...sharedConfig,
  recoveryMode: "none",
  chains: [1],
});

const blockNumberRequestHelper = (config: Config) => {
  const request = new Request(
    "https://my-test-rpc-provider.com/eth/mainnet?key=some-key",
    {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
    }
  );
  const cache = new RpcRequestCache(
    config,
    defaultMethodDescriptorRegistry,
    new PlacholderCache()
  );
  const requestHandler = new RequestHandler(config, request, cache);

  return requestHandler.handle();
};

describe("request handler - relay", () => {
  describe("all providers up", () => {
    const server = setupServer(
      handlers.alchemyReturnsBlockNumber,
      handlers.infuraReturnsBlockNumber,
      handlers.ankrReturnsBlockNumber
    );

    beforeAll(() => {
      server.listen({
        onUnhandledRequest: "error",
      });
    });

    afterAll(() => {
      server.close();
    });

    afterEach(() => {
      server.resetHandlers();
    });

    it("should successfully relay when recovery mode = cycle", async () => {
      const result = await blockNumberRequestHelper(configWithCycleRecovery);

      expect(result.ok).toBe(true);
    });

    it("should successfully relay when recovery mode = none", async () => {
      const result = await blockNumberRequestHelper(configWithNoRecovery);

      expect(result.ok).toBe(true);
    });
  });

  describe("one provider down", () => {
    const server = setupServer(
      handlers.alchemyReturns500,
      handlers.infuraReturnsBlockNumber,
      handlers.ankrReturnsBlockNumber
    );

    beforeAll(() => {
      server.listen({
        onUnhandledRequest: "error",
      });
    });

    afterAll(() => {
      server.close();
    });

    afterEach(() => {
      server.resetHandlers();
    });

    it("should successfully relay when recovery mode = cycle", async () => {
      const result = await blockNumberRequestHelper(configWithCycleRecovery);

      expect(result.ok).toBe(true);
    });

    it("should fail relay when recovery mode = none", async () => {
      await retry(100, async () => {
        const result = await blockNumberRequestHelper(configWithNoRecovery);

        expect(result.ok).toBe(false);
      });
    });
  });

  describe("two providers down", () => {
    const server = setupServer(
      handlers.alchemyReturns500,
      handlers.infuraReturns500,
      handlers.ankrReturnsBlockNumber
    );

    beforeAll(() => {
      server.listen({
        onUnhandledRequest: "error",
      });
    });

    afterAll(() => {
      server.close();
    });

    afterEach(() => {
      server.resetHandlers();
    });

    it("should successfully relay when recovery mode = cycle", async () => {
      const result = await blockNumberRequestHelper(configWithCycleRecovery);

      expect(result.ok).toBe(true);
    });

    it("should fail relay when recovery mode = none", async () => {
      await retry(100, async () => {
        const result = await blockNumberRequestHelper(configWithNoRecovery);

        expect(result.ok).toBe(false);
      });
    });
  });

  describe("all providers down", () => {
    const server = setupServer(
      handlers.alchemyReturns500,
      handlers.infuraReturns500,
      handlers.ankrReturns500
    );

    beforeAll(() => {
      server.listen({
        onUnhandledRequest: "error",
      });
    });

    afterAll(() => {
      server.close();
    });

    afterEach(() => {
      server.resetHandlers();
    });

    it("should fail even if mode = cycle", async () => {
      const result = await blockNumberRequestHelper(configWithCycleRecovery);

      expect(result.ok).toBe(false);
    });

    it("should fail relay when recovery mode = none", async () => {
      const result = await blockNumberRequestHelper(configWithNoRecovery);

      expect(result.ok).toBe(false);
    });
  });

  describe("chain config errors", () => {
    it('should fail with "Chain not found" message', async () => {
      const request = new Request(
        "https://my-test-rpc-provider.com/random/chain?key=some-key",
        {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_blockNumber",
            params: [],
          }),
        }
      );
      const cache = new RpcRequestCache(
        configWithCycleRecovery,
        defaultMethodDescriptorRegistry,
        new PlacholderCache()
      );
      const requestHandler = new RequestHandler(
        configWithCycleRecovery,
        request,
        cache
      );

      const result = await requestHandler.handle();

      expect(result.ok).toBe(false);

      const body: unknown = await result.json();

      expect(body).toMatchObject({
        message:
          "Chain not found. Make sure you have the correct chain id, or the networkName + chainName defined in the url.",
      });
    });

    it('should fail with "Chain is disabled" message', async () => {
      const config = new Config({
        chains: [15],
        providers: ["alchemy"],
        globalAccessKey: "some-key",
      });

      const request = new Request(
        "https://my-test-rpc-provider.com/1?key=some-key",
        {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_blockNumber",
            params: [],
          }),
        }
      );

      const cache = new RpcRequestCache(
        configWithCycleRecovery,
        defaultMethodDescriptorRegistry,
        new PlacholderCache()
      );

      const requestHandler = new RequestHandler(config, request, cache);

      const result = await requestHandler.handle();

      expect(result.ok).toBe(false);

      const body: unknown = await result.json();

      expect(body).toMatchObject({
        message: "Chain not enabled: 1",
      });
    });
  });

  describe("relaying with custom registry", () => {
    const server = setupServer(handlers.alchemyReturnsBlockNumber);

    beforeAll(() => {
      server.listen({
        onUnhandledRequest: "error",
      });
    });

    afterAll(() => {
      server.close();
    });

    afterEach(() => {
      server.resetHandlers();
    });

    it("should successfully relay", async () => {
      const registry = new Registry();

      registry
        .network("ethereum", ["eth"])
        .chain({ chainId: 1, name: "mainnet", blockTime: 12 });
      registry.provider("alchemy").support(1, {
        baseURL: "https://eth-mainnet.alchemyapi.io/v2",
        type: "url-append-key",
      });

      const config = new Config({
        chains: [1],
        providers: [
          {
            name: "alchemy",
            key: "key-1",
          },
        ],
        globalAccessKey: "some-key",
        registry,
      });

      const request = new Request(
        "https://my-test-rpc-provider.com/eth/mainnet?key=some-key",
        {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_blockNumber",
            params: [],
          }),
        }
      );

      const cache = new RpcRequestCache(
        config,
        defaultMethodDescriptorRegistry,
        new PlacholderCache()
      );

      const requestHandler = new RequestHandler(config, request, cache);

      const result = await requestHandler.handle();

      expect(result.ok).toBe(true);
    });
  });
});
