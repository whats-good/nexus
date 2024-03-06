import {
  Nexus,
  CHAIN,
  NODE_PROVIDER,
  queryParamKeyAuthMiddleware,
} from "@whatsgood/nexus";
import { createServer } from "node:http";

if (process.env.ALCHEMY_KEY === undefined) {
  throw new Error("ALCHEMY_KEY env var is required");
}
if (process.env.QUERY_PARAM_AUTH_KEY === undefined) {
  throw new Error("QUERY_PARAM_AUTH_KEY env var is required");
}

const nexus = Nexus.create({
  nodeProviders: [NODE_PROVIDER.alchemy.build(process.env.ALCHEMY_KEY)],
  chains: [CHAIN.EthMainnet],
  middlewares: [queryParamKeyAuthMiddleware(process.env.QUERY_PARAM_AUTH_KEY)],
});

createServer(nexus).listen(4005, () => {
  console.log(`🚀 Server ready at http://localhost:4005`);
});
