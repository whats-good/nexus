import { CHAIN } from "@src/chain";
import { NexusEvent } from "@src/events";
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

class SomeEvent extends NexusEvent {
  constructor(public readonly kerem: string) {
    super();
  }
}

const myEventHandler = async (event: SomeEvent, context: NexusContext) => {
  setTimeout(() => {
    context.config.logger.info(`Handling event: ${event.kerem}`);
  }, 1000);
};

const nexus = Nexus.create({
  nodeProviders: [NODE_PROVIDER.alchemy.build(process.env.ALCHEMY_KEY)],
  chains: [CHAIN.EthMainnet],
  logger,
  eventHandlers: [
    {
      event: SomeEvent,
      handler: myEventHandler,
    },
  ],
});

createServer(nexus).listen(4005, () => {
  // TODO: separate config into 2 parts:
  // first, a static config that doesn't depend on the server context.
  // put the logger in there.
  // and then use nexus.staticConfig.logger to log the message below.
  logger.info(`🚀 Server ready at http://localhost:4005`);
});
