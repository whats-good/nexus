import { Nexus } from "@whatsgood/nexus";
import { RequestHandler } from "@whatsgood/nexus/fetch";

// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)
// TODO: add tests for the worker

export default {
  async fetch(
    request: Request,
    env: Record<string, string>
  ): Promise<Response> {
    const nexus = new Nexus({
      env,
    });
    return RequestHandler.init(nexus, request).handle();
  },
};
