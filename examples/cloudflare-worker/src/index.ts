import { NexusServer } from "@whatsgood/nexus";

// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)
// TODO: add tests for the worker

type Env = Record<string, string>;

const server = NexusServer.create<Env>({
  env: (env) => env,
  providers: {
    alchemy: {
      enabled: true,
    },
  },
});

export default { fetch: server.fetch };
