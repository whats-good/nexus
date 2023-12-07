import { Nexus } from "@whatsgood/nexus";

// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)
// TODO: add tests for the worker

// TODO: add documentation for registry extensions

type Env = Record<string, string>;

const nexus = Nexus.create<Env>({
  // TODO: add a `createUserContext` function that generates the ctx object from the server context
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
  // TODO: maybe this should actually be just an env var?
  globalAccessKey: (ctx) => ctx.NEXUS_GLOBAL_ACCESS_KEY,
  chains: [1, 11155111],
});

export default {
  fetch: nexus.fetch,
};
