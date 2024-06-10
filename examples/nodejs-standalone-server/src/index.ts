import {
  Nexus,
  UnauthorizedAccessEvent,
  EventHandler,
  NexusRpcContext,
  authenticationMiddleware,
  NodeProvider,
  CHAIN,
} from "@whatsgood/nexus";
import { createServer } from "node:http";

// Step 1: Set up environment variables
// - Try putting your Alchemy key and a query param auth key in a .env file.

if (process.env.ALCHEMY_URL === undefined) {
  throw new Error("ALCHEMY_URL env var is required");
}

if (process.env.QUERY_PARAM_AUTH_KEY === undefined) {
  throw new Error("QUERY_PARAM_AUTH_KEY env var is required");
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
  url: process.env.ALCHEMY_URL,
});

// Step 4: Create a Nexus instance by putting it all together
// - If run as is, this server will only support Ethereum mainnet, and will use Alchemy as the only node provider.
// - You can add more node providers and chains to the nodeProviders and chains arrays.
// - Pay attention to the middlewares and eventHandlers arrays.
// - Nexus ships with a query param auth middleware, which you can use to gate access to your server.
// - If you don't need authorization, you can remove the queryParamKeyAuthMiddleware from the middlewares array.
// - You can also create your own middlewares and event handlers.
const nexus = Nexus.create({
  nodeProviders: [alchemyNodeProvider],
  port: 4005,
  eventHandlers: [onUnauthorizedAccess],
  middleware: [
    authenticationMiddleware({ authKey: process.env.QUERY_PARAM_AUTH_KEY }),
  ],
  log: { level: "debug" },
});

// Step 5: Start the server
createServer(nexus).listen(nexus.port, () => {
  console.log(`🚀 Server ready at http://localhost:${nexus.port}`);
});

// Step 6: Send a request to the server
// - Make sure you replace the query param key with the one you set in the .env file.

// curl http://localhost:4005/1\?key\=YOUR_SECRET_KEY \
//   -X POST \
//   -H "Content-Type: application/json" \
//   -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 5}'
