import { CHAIN } from "@src/chain";
import { NextFn, NexusMiddleware } from "@src/middleware";
import { Nexus } from "@src/nexus";
import { NODE_PROVIDER } from "@src/node-provider";
import { NexusContext } from "@src/rpc";
import { safeJsonStringify } from "@src/utils";

import { createServer } from "node:http";
import pino from "pino";

let i = 0;

const logger = pino({
  transport: {
    target: "pino-pretty",
  },
  level: "debug",
});

const myMiddleware: NexusMiddleware = async (
  ctx: NexusContext,
  next: NextFn
) => {
  logger.info(`middleware ${i++}`);
  logger.info(`ctx before: ${safeJsonStringify(ctx.response?.body())}`);
  await next();
  logger.info(`ctx after: ${safeJsonStringify(ctx.response?.body())}`);
};

const nexus = Nexus.create({
  nodeProviders: [NODE_PROVIDER.alchemy.build(process.env.ALCHEMY_KEY)],
  chains: [CHAIN.EthMainnet],
  logger,
  middlewares: [myMiddleware],
});

createServer(nexus).listen(4005, () => {
  // TODO: separate config into 2 parts:
  // first, a static config that doesn't depend on the server context.
  // put the logger in there.
  // and then use nexus.staticConfig.logger to log the message below.
  logger.info(`🚀 Server ready at http://localhost:4005`);
});
