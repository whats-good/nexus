import type { StaticContainer } from "@src/dependency-injection";
import type { NexusMiddlewareNextFn } from "@src/middleware";
import type { NexusRpcContext } from "@src/nexus-rpc-context";
import { UnauthorizedCustomErrorResponse } from "@src/rpc-response";

export async function authMiddleware(
  ctx: NexusRpcContext,
  container: StaticContainer,
  next: NexusMiddlewareNextFn
) {
  // TODO: NexusRpcContext fully assumes that it's an http request. But some functionality
  // like our middleware have reuse potential for other transports like websockets.
  // so, we should consider refactoring this to be more generic.

  if (!container.authorizationService.isAuthorized(ctx.url)) {
    const response = new UnauthorizedCustomErrorResponse(ctx.request.id);

    ctx.setResponse(response);

    return;
  }

  await next();
}
