import { Nexus } from "@whatsgood/nexus";
import { createServer } from "node:http";
import { getEnvConfig } from "./env-config";

const envConfig = getEnvConfig();

const nexus = Nexus.create({
  nodeProviders: envConfig.nodeProviders,
  log: envConfig.logLevel
    ? {
        level: envConfig.logLevel,
      }
    : undefined,
  port: envConfig.port,
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- this promise is safe
createServer(nexus).listen(nexus.port, () => {
  if (!nexus.port) {
    nexus.logger.warn(
      "No port configured. Server is running but port is unknown."
    );
  } else {
    nexus.logger.info(`🚀 Server ready at http://localhost:${nexus.port}`);
  }
});
