import { Nexus } from "@whatsgood/nexus";

type Env = Record<string, string>;

const nexus = Nexus.create<Env>({
  providers: (ctx) => [
    {
      name: "alchemy",
      key: ctx.ALCHEMY_KEY,
    },
    {
      name: "infura",
      key: ctx.INFURA_KEY,
    },
    {
      name: "ankr",
      key: ctx.ANKR_KEY,
    },
  ],
  chains: [1],
  globalAccessKey: (ctx) => ctx.NEXUS_GLOBAL_ACCESS_KEY,
  environment: (ctx) => ctx.NODE_ENV,
});

export default {
  fetch: nexus.fetch,
};
