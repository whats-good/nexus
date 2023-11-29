import { NexusServer } from "@whatsgood/nexus";

// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)
// TODO: add tests for the worker

// TODO: add documentation for registry extensions

type Env = Record<string, string>;

const server = NexusServer.create<Env>({
  env: (ctx) => ctx,
  providers: ["alchemy"],
  chains: [84531],
});

export default { fetch: server.fetch };
