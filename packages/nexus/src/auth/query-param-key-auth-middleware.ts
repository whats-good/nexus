import type { NexusMiddleware } from "@src/middleware";
import { UnauthorizedCustomErrorResponse } from "@src/rpc/rpc-response";
import { AuthorizedAccessEvent, UnauthorizedAccessEvent } from "./events";

export function queryParamKeyAuthMiddleware<TServerContext>(
  authKeyValue: string,
  authKeyQueryParamName = "key"
): NexusMiddleware<TServerContext> {
  if (authKeyValue.length === 0) {
    throw new Error("authKeyValue must be a non-empty string");
  }

  return async (context, next) => {
    const { request } = context.container;
    const requestUrl = new URL(request.url);
    const clientAccessKey = requestUrl.searchParams.get(authKeyQueryParamName);

    if (clientAccessKey !== authKeyValue) {
      context.container.eventBus.emit(new UnauthorizedAccessEvent());

      context.respond(
        new UnauthorizedCustomErrorResponse(context.request.getResponseId())
      );

      return;
    }

    context.container.eventBus.emit(new AuthorizedAccessEvent());

    return next();
  };
}
