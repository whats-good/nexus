import { Nexus, NodeProvider, CHAIN } from "@whatsgood/nexus";

import Fastify, { FastifyReply, FastifyRequest } from "fastify";

type FastifyContext = {
  req: FastifyRequest;
  reply: FastifyReply;
};

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
const nexus = Nexus.create<FastifyContext>({
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

// Step 4: Configure fastify
const app = Fastify({});

app.route({
  url: "/*",
  method: ["GET", "POST", "OPTIONS"],

  handler: async (req, reply) => {
    const response = await nexus.handleNodeRequest(req, {
      req,
      reply,
    });
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });
    reply.status(response.status);
    reply.send(response.body);
    return reply;
  },
});

// Step 5: Start the server
app.listen({
  port: nexus.port,
});
