import { Nexus } from "@whatsgood/nexus";

type Env = Record<string, string>;

const nexus = Nexus.create<Env>({
  providers: (ctx) => [
    "base",
    {
      name: "alchemy",
      key: ctx.NEXUS_PROVIDER_ALCHEMY_KEY,
    },
  ],
  globalAccessKey: (ctx) => ctx.NEXUS_GLOBAL_ACCESS_KEY,
  chains: [84531],
});

export default { fetch: nexus.fetch };
