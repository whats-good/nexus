import { Nexus } from "@whatsgood/nexus";
import { createServer } from "node:http";
import { getEnvConfig } from "./env-config";

const envConfig = getEnvConfig();

const DEFAULT_PORT = 4000;

const nexus = Nexus.create({
  nodeProviders: envConfig.nodeProviders,
  log: envConfig.logLevel
    ? {
        level: envConfig.logLevel,
      }
    : undefined,
  port: envConfig.port || DEFAULT_PORT,
  relay: envConfig.relay,
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- this promise is safe
createServer(nexus).listen(nexus.port, () => {
  if (!envConfig.port) {
    nexus.logger.warn(
      `⚠️  PORT environment variable not set. Defaulting to ${DEFAULT_PORT}`
    );
  }
  nexus.logger.info(`🚀 Server ready at http://localhost:${nexus.port}`);
});
