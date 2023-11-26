import { NexusServer } from "@whatsgood/nexus";

// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)
// TODO: add tests for the worker

type Env = Record<string, string>;

const server = NexusServer.create<Env>({
  providers: {
    // alchemy: {
    //   disabled: true,
    // },
    base: {
      disabled: true,
    },
    infura: {
      disabled: true,
    },
    ankr: {
      disabled: true,
    },
  },
  env: (env) => env,
});

export default { fetch: server.fetch };
