import { NexusServer } from "@whatsgood/nexus";
import { createServer } from "node:http";

const nexus = NexusServer.create({
  providers: ["base"],
  chains: [84531],
});

createServer(nexus).listen(4005, () => {
  console.log(`🚀 Server ready at http://localhost:4005`);
});
