import { Nexus } from "@whatsgood/nexus";

const nexus = Nexus.create({
  providers: [
    {
      name: "alchemy",
      key: process.env.ALCHEMY_KEY,
    },
    {
      name: "infura",
      key: process.env.INFURA_KEY,
    },
    {
      name: "ankr",
      key: process.env.ANKR_KEY,
    },
  ],
  chains: [1],
  globalAccessKey: process.env.NEXUS_GLOBAL_ACCESS_KEY,
  environment: process.env.NODE_ENV,
});

// TODO: fix this workaround. Make ports an official part of the API.
Object.assign(nexus, { port: 4005 });

Bun.serve(nexus);
