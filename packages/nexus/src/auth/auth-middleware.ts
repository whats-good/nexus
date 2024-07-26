import type { NexusMiddlewareNextFn } from "@src/middleware";
import type { NexusRpcContext } from "@src/nexus-rpc-context";
import { UnauthorizedCustomErrorResponse } from "@src/rpc-response";
import { container } from "@src/dependency-injection";
import { AuthorizationService } from "./authorization-service";

export async function authMiddleware(
  ctx: NexusRpcContext,
  next: NexusMiddlewareNextFn
) {
  // TODO: NexusRpcContext fully assumes that it's an http request. But some functionality
  // like our middleware have reuse potential for other transports like websockets.
  // so, we should consider refactoring this to be more generic.

  // TODO: remove this hack. the middleware should not create the auth service by itself.
  const authorizationService = container.resolve(AuthorizationService);

  if (!authorizationService.isAuthorized(ctx.url)) {
    const response = new UnauthorizedCustomErrorResponse(ctx.request.id);

    ctx.setResponse(response);

    return;
  }

  await next();
}
