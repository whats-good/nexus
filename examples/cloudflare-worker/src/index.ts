import {
  Nexus,
  UnauthorizedAccessEvent,
  EventHandler,
  NexusRpcContext,
  authenticationMiddleware,
  NodeProvider,
  CHAIN,
  NexusServerInstance,
} from "@whatsgood/nexus";

import { nextTick } from "node:process";

function createNexus(params: {
  alchemyUrl: string;
  queryParamAuthKey: string;
}) {
  // Step 1: Set up environment variables
  // - Try putting your Alchemy key and a query param auth key in a .dev.vars file.

  if (params.alchemyUrl === undefined) {
    throw new Error("ALCHEMY_URL is required");
  }

  if (params.queryParamAuthKey === undefined) {
    throw new Error("QUERY_PARAM_AUTH_KEY is required");
  }

  // Step 2: Create an example event handler.
  // - Feel free to remove this example or add your own event handlers.
  const onUnauthorizedAccess: EventHandler<UnauthorizedAccessEvent> = {
    event: UnauthorizedAccessEvent,
    handle: async (event: UnauthorizedAccessEvent, ctx: NexusRpcContext) => {
      ctx.container.logger.info(
        `Unauthorized access detected at: ${event.createdAt}.`
      );
    },
  };

  // Step 3: Initialize a node provider
  const alchemyNodeProvider = new NodeProvider({
    name: "alchemy",
    chain: CHAIN.ETHEREUM_MAINNET,
    url: params.alchemyUrl,
  });

  // Step 4: Create a Nexus instance by putting it all together
  const nexus = Nexus.create({
    nodeProviders: [alchemyNodeProvider],
    eventHandlers: [onUnauthorizedAccess],
    middleware: [
      authenticationMiddleware({ authKey: params.queryParamAuthKey }),
    ],
    log: { level: "debug" },
    nextTick, // pay attention to how we're passing nextTick via nodejs compat mode
  });

  return nexus;
}

let nexus: NexusServerInstance;

// Step 5: Set the fetch handler
export default {
  fetch: (request: Request, env: any) => {
    if (!nexus) {
      nexus = createNexus({
        alchemyUrl: env.ALCHEMY_URL,
        queryParamAuthKey: env.QUERY_PARAM_AUTH_KEY,
      });
    }
    return nexus(request);
  },
};

// Step 6: Send a request to the server
// - Make sure you replace the query param key with the one you set in the .env file.

// curl http://localhost:4005/1\?key\=YOUR_SECRET_KEY \
//   -X POST \
//   -H "Content-Type: application/json" \
//   -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 5}'
