import * as http from "node:http";
import * as WebSocket from "ws";
import { Nexus } from "@src/nexus";
import { NodeProvider } from "@src/node-provider";
import { CHAIN } from "@src/default-chains";
import { Chain } from "@src/chain";
import { WebSocketProxy } from "@src/websockets";

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

const harmonyChain = new Chain({
  name: "1666700000",
  chainId: 1666600000,
  blockTime: 8,
});

const harmonyWsNodeProvider = new NodeProvider({
  name: "harmony-ws",
  chain: harmonyChain,
  url: "wss://ws.s0.t.hmny.io",
  weight: 1,
});

const nexus = Nexus.create({
  nodeProviders: [
    llamaRpcNodeProvider,
    tenderlyNodeProvider,
    harmonyWsNodeProvider,
  ],
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

const nexusWs = new WebSocket.Server({ noServer: true });

nexusWs.on("connection", (client: WebSocket) => {
  const nodeEndpointPool =
    nexus.container.nodeEndpointPoolFactory.ws.get(harmonyChain);

  if (!nodeEndpointPool) {
    nexus.logger.error("No node connection found");
    client.terminate();

    return;
  }

  nodeEndpointPool
    .connect()
    .then((result) => {
      if (result.kind === "success") {
        nexus.logger.info("Connected to node");
        const proxy = new WebSocketProxy(client, result.ws, nexus.logger);

        proxy.start();

        return;
      }

      nexus.logger.error("Failed to connect to node");
      client.terminate();
    })
    .catch((error) => {
      nexus.logger.error(`Error: ${error}`);
      client.terminate();
    });
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises -- This promise is okay
const server = http.createServer(nexus);

server.on("upgrade", (req, socket, head) => {
  // TODO: how to generalize the /upgrade?
  nexusWs.handleUpgrade(req, socket, head, (ws) => {
    nexusWs.emit("connection", ws, req);
  });
});

server.listen(nexus.port, () => {
  nexus.logger.info(`🚀 Server ready at http://localhost:${nexus.port}`);
});
