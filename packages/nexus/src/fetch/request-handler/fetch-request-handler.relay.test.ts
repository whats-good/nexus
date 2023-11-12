import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "@test/mock-server-handlers";
import { retry } from "@test/utils";
import { Config } from "@lib/config";
import { Nexus } from "@lib/nexus";
import { RequestHandler } from "./request-handler";

const sharedConfig = {
  globalAccessKey: "some-key",
  providers: {
    alchemy: {
      key: "key-1",
    },
    infura: {
      key: "key-2",
    },
    ankr: {
      key: "key-3",
    },
  },
};

const configWithCycleRecovery = new Config({
  ...sharedConfig,
  recoveryMode: "cycle",
});

const configWithNoRecovery = new Config({
  ...sharedConfig,
  recoveryMode: "none",
});

const blockNumberRequestHelper = (config: Config) => {
  const nexus = new Nexus(config);
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
  const requestHandler = new RequestHandler(nexus, request);

  return requestHandler.handle();
};

describe("fetch request handler - relay", () => {
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
