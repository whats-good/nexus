import { NextFn } from "@src/middleware";
import { safeJsonStringify } from "@src/utils";
import { NexusContext } from "./nexus-context";
import { MethodDeniedCustomErrorResponse } from "./rpc-response";

export const requestFilterMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>,
  next: NextFn
): Promise<void> => {
  const { logger } = context.config;
  logger.info("request filter middleware");
  const { chain, request } = context;
  const { methodDescriptor } = request;
  const requestFilterResult = methodDescriptor.requestFilter({
    chain,
    params: request.payload.params,
  });

  if (requestFilterResult.kind === "deny") {
    context.respond(
      new MethodDeniedCustomErrorResponse(request.getResponseId())
    );
  } else if (requestFilterResult.kind === "failure") {
    // TODO: make this behavior configurable.
    logger.error(
      `Request filter for method ${
        request.payload.method
      } threw an error: ${safeJsonStringify(
        requestFilterResult.error
      )}. This should never happen, and it's a critical error. Denying access to method. Please report this, fix the bug, and restart the node.`
    );

    context.respond(
      new MethodDeniedCustomErrorResponse(request.getResponseId())
    );
  } else {
    return next();
  }
};
