import {
  Nexus,
  UnauthorizedAccessEvent,
  EventHandler,
  NexusRpcContext,
  NodeProvider,
  CHAIN,
} from "@whatsgood/nexus";
import express from "express";
import type { Request as Req, Response as Res } from "express";

interface ExpressContext extends Record<string, any> {
  req: Req;
  res: Res;
}

// Step 1: Create an example event handler.
// - Feel free to remove this example or add your own event handlers.
const onUnauthorizedAccess: EventHandler<UnauthorizedAccessEvent> = {
  event: UnauthorizedAccessEvent,
  handle: async (event: UnauthorizedAccessEvent, ctx: NexusRpcContext) => {
    ctx.container.logger.info(
      `Unauthorized access detected at: ${event.createdAt}.`
    );
  },
};

// Step 2: Initialize node providers
const llamaRpcNodeProvider = new NodeProvider({
  name: "llama-rpc",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: "https://eth.llamarpc.com",
});

const tenderlyNodeProvider = new NodeProvider({
  name: "tenderly",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: "https://gateway.tenderly.co/public/mainnet",
});

// Step 3: Create a Nexus instance by putting it all together
const nexus = Nexus.create<ExpressContext>({
  nodeProviders: [llamaRpcNodeProvider, tenderlyNodeProvider],
  eventHandlers: [onUnauthorizedAccess],
  log: { level: "debug" },
  port: 4000,
  relay: {
    order: "random",
  },
});

console.log(`🚀 Server ready at http://localhost:${nexus.port}`);

// Step 4: Start the server
const app = express();

app.use("/", nexus);

app.listen(nexus.port, () => {
  console.info(`Running on port: ${nexus.port}`);
});
