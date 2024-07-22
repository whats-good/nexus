import type { NexusRpcContext } from "@src/dependency-injection";
import type { NexusMiddlewareNextFn } from "@src/middleware";
import { UnauthorizedCustomErrorResponse } from "@src/rpc-response";

export async function authMiddleware(
  ctx: NexusRpcContext,
  next: NexusMiddlewareNextFn
) {
  // TODO: NexusRpcContext fully assumes that it's an http request. But some functionality
  // like our middleware have reuse potential for other transports like websockets.
  // so, we should consider refactoring this to be more generic.

  if (!ctx.container.authorizationService.isAuthorized(ctx.url)) {
    const response = new UnauthorizedCustomErrorResponse(ctx.requestId);

    ctx.setResponse(response);

    return;
  }

  await next();
}
