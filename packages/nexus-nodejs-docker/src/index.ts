import {
  Nexus,
  NexusMiddleware,
  authenticationMiddleware,
} from "@whatsgood/nexus";
import { createServer } from "node:http";
import { getEnvConfig } from "./env-config";

const envConfig = getEnvConfig();

const DEFAULT_PORT = 4000;

const middleware: NexusMiddleware[] = [];

if (envConfig.authKey) {
  middleware.push(authenticationMiddleware({ authKey: envConfig.authKey }));
}

const nexus = Nexus.create({
  nodeProviders: envConfig.nodeProviders,
  log: envConfig.logLevel
    ? {
        level: envConfig.logLevel,
      }
    : undefined,
  port: envConfig.port || DEFAULT_PORT,
  relay: envConfig.relay,
  middleware,
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- this promise is safe
createServer(nexus).listen(nexus.port, () => {
  if (!envConfig.port) {
    nexus.logger.warn(
      `️⚠️️ PORT environment variable not set. Defaulting to ${DEFAULT_PORT}`
    );
  }
  if (!envConfig.authKey) {
    nexus.logger.warn(
      "⚠️ AUTH_KEY environment variable not set. Authentication middleware inactive."
    );
  }
  if (envConfig.overwrittenChains.length > 0) {
    nexus.logger.warn(
      `⚠️ Overwritten chain configs detected: ${JSON.stringify(
        envConfig.overwrittenChains,
        null,
        2
      )}`
    );
  }
  nexus.logger.info(`🚀 Server ready at http://localhost:${nexus.port}`);
});
