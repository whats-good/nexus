import { Nexus } from "@whatsgood/nexus";

// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)
// TODO: add tests for the worker

// TODO: add documentation for registry extensions

type Env = Record<string, string>;

const nexus = Nexus.create<Env>({
  // TODO: add a `createUserContext` function that generates the ctx object from the server context
  providers: (ctx) => [
    "base",
    {
      name: "alchemy",
      key: ctx.NEXUS_PROVIDER_ALCHEMY_KEY,
    },
  ],
  // TODO: maybe this should actually be just an env var?
  globalAccessKey: (ctx) => ctx.NEXUS_GLOBAL_ACCESS_KEY,
  chains: [84531],
});

export default { fetch: nexus.fetch };
