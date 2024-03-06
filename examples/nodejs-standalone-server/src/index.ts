import { Nexus, CHAIN, NODE_PROVIDER } from "@whatsgood/nexus";
import { createServer } from "node:http";

const nexus = Nexus.create({
  nodeProviders: [NODE_PROVIDER.alchemy.build(process.env.ALCHEMY_KEY)],
  chains: [CHAIN.EthMainnet],
});

createServer(nexus).listen(4005, () => {
  console.log(`🚀 Server ready at http://localhost:4005`);
});
