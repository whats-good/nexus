import { Nexus } from "@whatsgood/nexus";
import { createServer } from "node:http";

const nexus = Nexus.create({
  providers: ["base"],
  chains: [84531],
  globalAccessKey: process.env.NEXUS_GLOBAL_ACCESS_KEY,
});

createServer(nexus).listen(4005, () => {
  console.log(`🚀 Server ready at http://localhost:4005`);
});
