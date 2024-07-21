import { Nexus } from "@whatsgood/nexus";
import { createServer } from "node:http";

const nexus = Nexus.create();

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- this promise is safe
const server = createServer(nexus);
const nwss = nexus.wsServer();
server.on("upgrade", nwss.handleUpgrade.bind(nwss));

server.listen(nexus.port, () => {
  nexus.logger.info(`🚀 Server ready at http://localhost:${nexus.port}`);
});
