import { Nexus } from "@whatsgood/nexus";

// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)
// TODO: add tests for the worker

const server = Nexus.createServer({
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
});

export default {
  async fetch(
    request: Request,
    env: Record<string, string>
  ): Promise<Response> {
    return server.fetch(request, env);
  },
};
