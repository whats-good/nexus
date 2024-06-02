import { createServer } from "node:http";
import { Chain } from "@src/chain";
import { Nexus } from "@src/nexus";
import { NodeProvider } from "@src/node-provider";

const ethMainnet = new Chain({
  chainId: 1,
  name: "eth_mainnet",
  blockTime: 12,
});

const alchemy1 = new NodeProvider({
  name: "alchemy1",
  url: process.env.ALCHEMY_1_URL!,
  chain: ethMainnet,
});

// const alchemy2 = new NodeProvider({
//   name: "alchemy2",
//   url: "https://eth-mainnet.alchemyapi.io/v2/5678",
//   chain: ethMainnet,
// });

const nexus = Nexus.create({
  nodeProviders: [alchemy1],
  relay: {
    failure: {
      kind: "cycle-requests",
      maxAttempts: 3,
    },
    order: "random",
  },
  port: 3000,
});

createServer(nexus as any).listen(nexus.port, () => {
  console.log(`🚀 Server ready at http://localhost:${nexus.port}`);
});
