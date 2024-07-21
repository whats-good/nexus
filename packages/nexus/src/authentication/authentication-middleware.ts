import type { NexusRpcContext } from "@src/dependency-injection";
import type { NexusMiddlewareNextFn } from "@src/middleware";
import { UnauthorizedCustomErrorResponse } from "@src/rpc-response";
import { UnauthorizedAccessEvent } from "./events";

export async function authenticationMiddleware<TPlatformContext = unknown>(
  ctx: NexusRpcContext<TPlatformContext>,
  next: NexusMiddlewareNextFn
) {
  // TODO: NexusRpcContext fully assumes that it's an http request. But some functionality
  // like our middleware have reuse potential for other transports like websockets.
  // so, we should consider refactoring this to be more generic.

  const requestUrl = new URL(ctx.request.url);

  if (ctx.container.authorizationService.isAuthorized(requestUrl)) {
    const response = new UnauthorizedCustomErrorResponse(ctx.requestId);

    ctx.setResponse(response);
    const event = new UnauthorizedAccessEvent();

    ctx.eventBus.dispatch(event);

    return;
  }

  await next();
}
