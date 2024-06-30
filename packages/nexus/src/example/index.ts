import { createServer } from "node:http";
import { Nexus } from "@src/nexus";
import { NodeProvider } from "@src/node-provider";
import { CHAIN } from "@src/default-chains";
// import { weightedShuffle } from "..";

const llamaRpcNodeProvider = new NodeProvider({
  name: "llama-rpc",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: "https://eth.llamarpc.com",
  weight: 3,
});

const tenderlyNodeProvider = new NodeProvider({
  name: "tenderly",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: "https://gateway.tenderly.co/public/mainnet",
  weight: 11,
});

// const providers = [llamaRpcNodeProvider, tenderlyNodeProvider];

// const picks = new Map<string, number>();

// for (let i = 0; i < 100000; i++) {
//   const shuffled = weightedShuffle(providers);
//   const first = shuffled[0];

//   picks.set(first.name, (picks.get(first.name) || 0) + 1);
// }

// console.log(picks);
// console.log("actual ratio", picks.get("llama-rpc")! / picks.get("tenderly")!);
// console.log(
//   "expected ratio",
//   llamaRpcNodeProvider.weight / tenderlyNodeProvider.weight
// );

const nexus = Nexus.create({
  nodeProviders: [llamaRpcNodeProvider, tenderlyNodeProvider],
  relay: {
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
createServer(nexus).listen(nexus.port, () => {
  nexus.logger.info(`🚀 Server ready at http://localhost:${nexus.port}`);
});
