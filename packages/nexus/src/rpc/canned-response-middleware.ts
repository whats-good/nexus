import { NextFn } from "@src/middleware";
import { safeJsonStringify } from "@src/utils";
import { NexusContext } from "./nexus-context";
import { RpcSuccessResponse } from "./rpc-response";

export const cannedResponseMiddleware = async <TServerContext>(
  context: NexusContext<TServerContext>,
  next: NextFn
) => {
  const { logger } = context.config;
  logger.debug("canned response middleware");
  const { request } = context;
  const { methodDescriptor } = request;

  const cannedResponse = methodDescriptor.cannedResponse({
    chain: context.chain,
    params: request.payload.params,
  });

  if (cannedResponse.kind === "success") {
    logger.info(
      `Returning canned response for method ${request.payload.method}.`
    );

    return context.respond(
      new RpcSuccessResponse(request.getResponseId(), cannedResponse.result)
    );
  } else if (cannedResponse.kind === "failure") {
    logger.error(
      `Canned response for method ${
        request.payload.method
      } threw an error: ${safeJsonStringify(
        cannedResponse.error
      )}. This should not happen, but it's not fatal. Moving on.`
    );
  }
  return next();
};
