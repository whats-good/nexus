import { Nexus } from "@whatsgood/nexus";
import { createServer } from "node:http";

const nexus = Nexus.create({
  providers: [
    {
      name: "alchemy",
      key: process.env.ALCHEMY_KEY,
    },
    {
      name: "infura",
      key: process.env.INFURA_KEY,
    },
    {
      name: "ankr",
      key: process.env.ANKR_KEY,
    },
  ],
  chains: [1],
  globalAccessKey: process.env.NEXUS_GLOBAL_ACCESS_KEY,
});

createServer(nexus).listen(4005, () => {
  console.log(`🚀 Server ready at http://localhost:4005`);
});
