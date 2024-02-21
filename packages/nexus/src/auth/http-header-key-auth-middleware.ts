import { NexusMiddleware } from "@src/middleware";
import { UnauthorizedCustomErrorResponse } from "@src/rpc/rpc-response";
import { AuthorizedAccessEvent, UnauthorizedAccessEvent } from "./events";

export function httpHeaderKeyAuthMiddleware<TServerContext>(
  authKeyValue: string,
  authKeyQueryParamName: string = "X-Auth-Key"
): NexusMiddleware<TServerContext> {
  if (authKeyValue.length === 0) {
    console.log("authKeyValue must be a non-empty string");
    throw new Error("authKeyValue must be a non-empty string");
  }
  return async (context, next) => {
    const { request } = context.container;
    const clientAccessKey = request.headers.get(authKeyQueryParamName);
    if (clientAccessKey !== authKeyValue) {
      context.container.eventBus.emit(new UnauthorizedAccessEvent());
      return context.respond(
        new UnauthorizedCustomErrorResponse(context.request.getResponseId())
      );
    } else {
      context.container.eventBus.emit(new AuthorizedAccessEvent());
      return next();
    }
  };
}
