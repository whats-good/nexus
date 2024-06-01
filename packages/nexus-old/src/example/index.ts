import { createServer } from "node:http";
import pino from "pino";
import { SimpleMemoryCache } from "@src/cache/simple-memory-cache";
import { CHAIN } from "@src/chain";
import { NexusEvent } from "@src/events";
import { Nexus } from "@src/nexus";
import { NODE_PROVIDER } from "@src/node-provider";
import type { Container } from "@src/dependency-injection";
import { queryParamKeyAuthMiddleware } from "@src/auth";

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

const myEventHandler = async (event: SomeEvent, container: Container) => {
  setTimeout(() => {
    container.logger.info(`Handling event: ${event.kerem}`);
  }, 1000);
};

const myOtherEventHandler = async (event: SomeEvent, container: Container) => {
  setTimeout(() => {
    container.logger.info(`Handling event again: ${event.kerem}`);
  }, 1000);
};

if (process.env.ALCHEMY_KEY === undefined) {
  throw new Error("ALCHEMY_KEY env var is required");
}

if (process.env.QUERY_PARAM_AUTH_KEY === undefined) {
  throw new Error("QUERY_PARAM_AUTH_KEY env var is required");
}

const nexus = Nexus.create({
  nodeProviders: [NODE_PROVIDER.alchemy.build(process.env.ALCHEMY_KEY)],
  chains: [CHAIN.EthMainnet],
  logger,
  cache: new SimpleMemoryCache(),
  middlewares: [
    queryParamKeyAuthMiddleware(process.env.QUERY_PARAM_AUTH_KEY, "key"),
    // httpHeaderKeyAuthMiddleware(process.env.QUERY_PARAM_AUTH_KEY, "X-Auth-Key"),
  ],
  eventHandlers: [
    {
      event: SomeEvent,
      handler: myEventHandler,
    },
    {
      event: SomeEvent,
      handler: myOtherEventHandler,
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- library type issue
createServer(nexus).listen(4005, () => {
  // TODO: separate config into 2 parts:
  // first, a static config that doesn't depend on the server context.
  // put the logger in there.
  // and then use nexus.staticConfig.logger to log the message below.
  logger.info(`🚀 Server ready at http://localhost:4005`);
});
