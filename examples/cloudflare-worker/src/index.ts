import {
  Nexus,
  UnauthorizedAccessEvent,
  EventHandler,
  NexusRpcContext,
  NodeProvider,
  CHAIN,
  NexusServerInstance,
} from "@whatsgood/nexus";
import * as process from "node:process";

let nexus: NexusServerInstance;

function createNexus(env: Record<string, string>) {
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
  return Nexus.create({
    nodeProviders: [llamaRpcNodeProvider, tenderlyNodeProvider],
    eventHandlers: [onUnauthorizedAccess],
    log: { level: "debug" },
    port: 4000,
    relay: {
      order: "random",
    },
    env,
    nextTick: process.nextTick,
  });
}

// Step 4: Set the fetch handler
export default {
  fetch: (request: Request, env: Record<string, string>) => {
    if (!nexus) {
      nexus = createNexus(env);
    }
    return nexus(request);
  },
};
