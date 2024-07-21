import * as http from "node:http";
import { Nexus } from "@src/nexus";
import { NodeProvider } from "@src/node-provider";
import { CHAIN } from "@src/default-chains";
import { Chain } from "@src/chain";

// const llamaRpcNodeProvider = new NodeProvider({
//   name: "llama-rpc",
//   chain: CHAIN.ETHEREUM_MAINNET,
//   url: "https://eth.llamarpc.com",
//   weight: 3,
// });

const tenderlyNodeProvider = new NodeProvider({
  name: "tenderly",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: "https://gateway.tenderly.co/public/mainnet",
  weight: 11,
});

const harmonyChain = new Chain({
  name: "harmony",
  chainId: 1666600000,
  blockTime: 8,
});

const harmonyWsNodeProvider = new NodeProvider({
  name: "harmony-ws",
  chain: harmonyChain,
  url: "wss://ws.s0.t.hmny.io",
  weight: 1,
});

const alchemyWsNodeProvider = new NodeProvider({
  name: "alchemy-ws",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: process.env.ALCHEMY_WS_URL!,
  weight: 1,
});

const nexus = Nexus.create({
  nodeProviders: [
    // llamaRpcNodeProvider,
    tenderlyNodeProvider,
    harmonyWsNodeProvider,
    alchemyWsNodeProvider,
  ],
  relay: {
    // TODO: update relay config to use more standard language like:
    // round-robin, random, weighted-random, etc.
    // TODO: generalize the maxAttempts, and pull them up to the top level
    // so that setting it to 1 means no retries, setting it to 0 means infinite,
    // etc
    failure: {
      kind: "cycle-requests",
      maxAttempts: 3,
    },
    order: "random",
  },
  rpcAuthKey: "my-secret-key",
  log: {
    level: "debug",
  },
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- This promise is okay
const server = http.createServer(nexus);
const nwss = nexus.wsServer();

// TODO: add this to docs.
server.on("upgrade", nwss.handleUpgrade.bind(nwss));

// TODO: should allow starting nexus directly via nexus.start(), without needing to pass
// nexus into an http server instance, or to pass the http server into nexus to start the
// websocket server.

server.listen(nexus.port, () => {
  nexus.logger.info(`🚀 Server ready at http://localhost:${nexus.port}`);
});
