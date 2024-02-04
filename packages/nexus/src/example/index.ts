import { CHAIN } from "@src/chain";
import { Nexus } from "@src/nexus";
import { SERVICE_PROVIDER } from "@src/service-provider";

import { createServer } from "node:http";

const nexus = Nexus.create({
  serviceProviders: [SERVICE_PROVIDER.alchemy.build(process.env.ALCHEMY_KEY)],
  chains: [CHAIN.EthMainnet],
});

createServer(nexus).listen(4005, () => {
  // TODO: separate config into 2 parts:
  // first, a static config that doesn't depend on the server context.
  // put the logger in there.
  // and then use nexus.staticConfig.logger to log the message below.
  console.log(`🚀 Server ready at http://localhost:4005`);
});
