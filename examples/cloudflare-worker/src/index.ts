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
  globalAccessKey: (ctx) => ctx.NEXUS_GLOBAL_ACCESS_KEY,
  chains: [1, 11155111],
});

export default {
  fetch: nexus.fetch,
};
