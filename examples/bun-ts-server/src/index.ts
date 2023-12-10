import { Nexus } from "@whatsgood/nexus";

const nexus = Nexus.create({
  providers: ["base"],
  chains: [84531],
  globalAccessKey: process.env.NEXUS_GLOBAL_ACCESS_KEY,
});

// TODO: fix this workaround. Make ports an official part of the API.
Object.assign(nexus, { port: 4005 });

Bun.serve(nexus);
