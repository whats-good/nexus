import { Nexus } from "@whatsgood/nexus";
import { createServer } from "node:http";

const nexus = Nexus.create();

const server = createServer(nexus);
nexus.ws(server);

server.listen(nexus.port, () => {
  nexus.logger.info(`🚀 Server ready at http://localhost:${nexus.port}`);
});
