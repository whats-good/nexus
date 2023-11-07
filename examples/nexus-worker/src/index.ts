import { Config, RpcProxyResponseHandler } from "@whatsgood/nexus";

// TODO: add config alerts to indicate that the key access is incomplete
// TODO: add onboarding & UX. (setup admin access, login, etc)

export default {
  async fetch(
    request: Request,
    env: Record<string, string>
  ): Promise<Response> {
    const config = new Config({
      env,
    });
    const responseHandler = new RpcProxyResponseHandler({
      config,
    });
    return responseHandler.handle(request);
  },
};
