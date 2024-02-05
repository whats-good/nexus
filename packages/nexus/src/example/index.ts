import { CHAIN } from "@src/chain";
import { Nexus } from "@src/nexus";
import { NODE_PROVIDER } from "@src/node-provider";
import { safeJsonStringify } from "@src/utils";

import { createServer } from "node:http";
import pino from "pino";

let i = 0;

const logger = pino();

const nexus = Nexus.create({
  nodeProviders: [NODE_PROVIDER.alchemy.build(process.env.ALCHEMY_KEY)],
  chains: [CHAIN.EthMainnet],
  logger,
  middlewares: [
    async (ctx, next) => {
      // TODO: give access to the config object in the middleware.
      // or perhaps put the config object in the context.
      // or start using abstract classes where you make the logger a property of the abstract class.
      logger.info(`middleware ${i++}`);
      logger.info(`ctx before: ${safeJsonStringify(ctx.response?.body())}`);
      await next();
      logger.info(`ctx after: ${safeJsonStringify(ctx.response?.body())}`);
    },
  ],
});

createServer(nexus).listen(4005, () => {
  // TODO: separate config into 2 parts:
  // first, a static config that doesn't depend on the server context.
  // put the logger in there.
  // and then use nexus.staticConfig.logger to log the message below.
  console.log(`🚀 Server ready at http://localhost:4005`);
});
