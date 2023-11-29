import { NexusServer } from "@whatsgood/nexus";
import { createServer } from "node:http";

const server = NexusServer.create({
  providers: ["base"],
  chains: [84531],
});

createServer(server).listen(4005, () => {
  console.log(`🚀 Server ready at http://localhost:4005`);
});
