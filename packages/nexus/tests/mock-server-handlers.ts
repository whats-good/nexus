import { rest } from "msw";

const blockNumberMockResponse = {
  jsonrpc: "2.0",
  id: 1,
  method: "eth_getBlockByNumber",
  params: ["latest", false],
};

export const handlers = {
  alchemyReturnsBlockNumber: rest.post(
    "https://eth-mainnet.alchemyapi.io/*",
    (req, res, ctx) => {
      return res(ctx.json(blockNumberMockResponse));
    }
  ),
  alchemyReturns500: rest.post(
    "https://eth-mainnet.alchemyapi.io/*",
    (req, res, ctx) => {
      return res(ctx.status(500));
    }
  ),
  infuraReturnsBlockNumber: rest.post(
    "https://mainnet.infura.io/*",
    (req, res, ctx) => {
      return res(ctx.json(blockNumberMockResponse));
    }
  ),
  infuraReturns500: rest.post(
    "https://mainnet.infura.io/*",
    (req, res, ctx) => {
      return res(ctx.status(500));
    }
  ),
  ankrReturnsBlockNumber: rest.post(
    "https://rpc.ankr.com/*",
    (req, res, ctx) => {
      return res(ctx.json(blockNumberMockResponse));
    }
  ),
  ankrReturns500: rest.post("https://rpc.ankr.com/*", (req, res, ctx) => {
    return res(ctx.status(500));
  }),
};
