import { describe, expect, it } from "vitest";
import { matchPath } from "./routes";

describe("routes", () => {
  describe("happy path", () => {
    it("chain id", () => {
      expect(matchPath("/1")?.params).toEqual({
        chainId: 1,
      });
    });

    it("network name and chain name", () => {
      expect(matchPath("/ethereum/mainnet")?.params).toEqual({
        networkName: "ethereum",
        chainName: "mainnet",
      });
    });
  });

  describe("unhappy path", () => {
    it("rpc: no chain id or chain name", () => {
      expect(matchPath("/")?.params).toEqual(undefined);
    });

    it("rpc: network name without chain name", () => {
      expect(matchPath("/ethereum")?.params).toEqual(undefined);
    });
  });
});
