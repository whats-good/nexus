import { createServer } from "node:http";
import { Chain } from "@src/chain";
import { Nexus } from "@src/nexus";
import { NodeProvider } from "@src/node-provider";
import type { NexusRpcContext } from "@src/dependency-injection";
import { RpcResponseSuccessEvent } from "@src/node-relay-handler/events";
import { authenticationMiddleware } from "@src/authentication";

const ethMainnet = new Chain({
  chainId: 1,
  name: "eth_mainnet",
  blockTime: 12,
});

const alchemy1 = new NodeProvider({
  name: "alchemy1",
  url: process.env.ALCHEMY_URL!,
  chain: ethMainnet,
});

// const alchemy2 = new NodeProvider({
//   name: "alchemy2",
//   url: "https://eth-mainnet.alchemyapi.io/v2/5678",
//   chain: ethMainnet,
// });

// const nexus = Nexus.create({
//   nodeProviders: [alchemy1],
//   relay: {
//     failure: {
//       kind: "cycle-requests",
//       maxAttempts: 3,
//     },
//     order: "random",
//   },
//   middleware: [authenticationMiddleware({ authKey: "my-secret-key" })],
//   port: 3000,
//   // TODO: add env var support for log config.
//   log: {
//     level: "debug",
//   },
//   eventHandlers: [
//     {
//       event: RpcResponseSuccessEvent,
//       handle: async (
//         event: RpcResponseSuccessEvent,
//         ctx: NexusRpcContext
//       ): Promise<void> => {
//         const logger = ctx.container.logger.child({
//           name: "rpc-response-success",
//         });

//         logger.info(event.payload);
//       },
//     },
//   ],
// });

const nexus = Nexus.create({});

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
