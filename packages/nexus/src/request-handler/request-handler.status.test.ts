import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { Config } from "@src/config";
import { handlers } from "@test/mock-server-handlers";
import { RequestHandler } from "./request-handler";

export const requestHelper = async (endpoint: string, config: Config) => {
  const request = new Request(`https://my-test-rpc-provider.com${endpoint}`, {
    method: "GET",
  });
  const requestHandler = new RequestHandler();
  const response = await requestHandler.handle(config, request);
  const data: unknown = await response.json();

  return data;
};

describe("request handler - status", () => {
  describe("providers are up", () => {
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

    it("unprotected", async () => {
      const data = await requestHelper(
        "/ethereum/mainnet",
        new Config({
          chains: [1],
          providers: [
            {
              name: "alchemy",
              key: "key-1",
            },
          ],
        })
      );

      expect(data).toMatchObject({
        success: false,
        message: "Endpoint is not protected. Please set config.globalAccessKey",
        access: "unprotected",
        code: 401,
        chain: {
          chainId: 1,
          networkName: "ethereum",
          chainName: "mainnet",
        },
      });
    });

    it("protected", async () => {
      const data = await requestHelper(
        "/ethereum/mainnet?key=some-key",
        new Config({
          chains: [1],
          providers: [
            {
              name: "alchemy",
              key: "key-1",
            },
          ],
          globalAccessKey: "some-key",
        })
      );

      expect(data).toMatchObject({
        success: true,
        message: "Provider is up and running.",
        access: "authorized",
        code: 200,
        chain: {
          chainId: 1,
          networkName: "ethereum",
          chainName: "mainnet",
        },
      });
    });

    it("protected but unauthorized", async () => {
      const data = await requestHelper(
        "/ethereum/mainnet",
        new Config({
          chains: [1],
          providers: [
            {
              name: "alchemy",
              key: "key-1",
            },
          ],
          globalAccessKey: "some-key",
        })
      );

      expect(data).toMatchObject({
        success: false,
        message: "Access denied.",
        access: "unauthorized",
        code: 401,
        chain: {
          chainId: 1,
          networkName: "ethereum",
          chainName: "mainnet",
        },
      });
    });

    it("not configured, via chain name", async () => {
      const data = await requestHelper(
        "/ethereum/mainnet",
        new Config({
          chains: [1],
          providers: ["random-provider"],
        })
      );

      expect(data).toMatchObject({
        success: false,
        message:
          "Incomplete setup. Make sure you have at least one properly configured provider for this chain.",
        access: "unprotected",
        code: 404,
        chain: {
          chainId: 1,
          networkName: "ethereum",
          chainName: "mainnet",
        },
      });
    });

    it("not configured, via chain id", async () => {
      const data = await requestHelper(
        "/1",
        new Config({
          chains: [1],
          providers: ["random-provider"],
        })
      );

      expect(data).toMatchObject({
        success: false,
        message:
          "Incomplete setup. Make sure you have at least one properly configured provider for this chain.",
        access: "unprotected",
        code: 404,
        chain: {
          chainId: 1,
          networkName: "ethereum",
          chainName: "mainnet",
        },
      });
    });
  });

  // describe("external providers not configured, but only accessing localhost", () => {
  //   it.only("via chain name", async () => {
  //     const data = await requestHelper(
  //       "/local/forge?key=some-key",
  //       new Config({
  //         globalAccessKey: "some-key",
  //       })
  //     );

  //     expect(data).toMatchObject({
  //       success: false,
  //       message: "Provider is down.",
  //       access: "authorized",
  //       code: 500,
  //       chain: {
  //         chainId: 1,
  //         networkName: "ethereum",
  //         chainName: "mainnet",
  //       },
  //     });
  //   });
  // });

  describe("providers are down", () => {
    const server = setupServer(handlers.alchemyReturns500);

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

    it("via chain name", async () => {
      const data = await requestHelper(
        "/ethereum/mainnet?key=some-key",
        new Config({
          providers: [
            {
              name: "alchemy",
              key: "key-1",
            },
          ],
          chains: [1],
          globalAccessKey: "some-key",
        })
      );

      expect(data).toMatchObject({
        success: false,
        message: "Provider is down.",
        access: "authorized",
        code: 500,
        chain: {
          chainId: 1,
          networkName: "ethereum",
          chainName: "mainnet",
        },
      });
    });
  });
});
