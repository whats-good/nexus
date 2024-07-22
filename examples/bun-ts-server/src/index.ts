import { Nexus, NodeProvider, CHAIN } from "@whatsgood/nexus";

// Step 1: Initialize node providers
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

// Step 2: Create a Nexus instance by putting it all together
const nexus = Nexus.create({
  nodeProviders: [llamaRpcNodeProvider, tenderlyNodeProvider],
  log: { level: "debug" },
  port: 4000,
  relay: {
    order: "random",
  },
});

// Step 3: Optionally define event handlers
nexus.on("rpcResponseSuccess", (response, ctx) => {
  nexus.logger.debug(
    {
      response: response.body(),
      chain: ctx.chain,
    },
    "rpc response success event captured"
  );
});

console.log(`🚀 Server ready at http://localhost:${nexus.port}`);
Bun.serve(nexus);
