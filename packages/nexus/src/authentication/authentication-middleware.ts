import type { NexusRpcContext } from "@src/dependency-injection";
import type { NexusMiddleware, NexusMiddlewareNextFn } from "@src/middleware";
import { UnauthorizedCustomErrorResponse } from "@src/rpc-response";
import { UnauthorizedAccessEvent } from "./events";

const AUTH_KEY_QUERY_PARAM_NAME = "key";

export const getAuthenticationMiddleware = <
  TPlatformContext = unknown,
>(params: {
  authKey: string;
}): NexusMiddleware<TPlatformContext> =>
  async function authenticationMiddleware(
    ctx: NexusRpcContext<TPlatformContext>,
    next: NexusMiddlewareNextFn
  ) {
    // TODO: NexusRpcContext fully assumes that it's an http request. But some functionality
    // like our middleware have reuse potential for other transports like websockets.
    // so, we should consider refactoring this to be more generic.

    const requestUrl = new URL(ctx.request.url);
    const clientAccessKey = requestUrl.searchParams.get(
      AUTH_KEY_QUERY_PARAM_NAME
    );

    if (clientAccessKey !== params.authKey) {
      const response = new UnauthorizedCustomErrorResponse(ctx.requestId);

      ctx.setResponse(response);
      const event = new UnauthorizedAccessEvent();

      ctx.eventBus.dispatch(event);

      return;
    }

    await next();
  };
