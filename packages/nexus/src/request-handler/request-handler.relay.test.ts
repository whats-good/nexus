import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { Config } from "@src/config";
import { handlers } from "@test/mock-server-handlers";
import { retry } from "@test/utils";
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
  ],
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
  const requestHandler = new RequestHandler();

  return requestHandler.handle(config, request);
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
});
