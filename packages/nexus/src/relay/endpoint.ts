import type { RpcRequestPayload } from "../rpc/schemas";
import {
  ErrorResponsePayloadSchema,
  SuccessResponsePayloadSchema,
} from "../rpc/schemas";
import type { Chain } from "../chain";
import type { ServiceProvider } from "../service-provider/service-provider";
import {
  InternalFetchError,
  Non200Response,
  NonJsonResponse,
  SuccessResponse,
  type RelayResult,
  ErrorResponse,
  UnexpectedResponse,
} from "./relay-result";

export class Endpoint {
  constructor(
    public readonly serviceProvider: ServiceProvider,
    public readonly chain: Chain,
    public readonly url: string
  ) {}

  public async relay(request: RpcRequestPayload): Promise<RelayResult> {
    const cleanedRequest = new Request(this.url, {
      body: JSON.stringify(request),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let relayResponse: Response;

    try {
      relayResponse = await fetch(cleanedRequest);
    } catch (error) {
      return new InternalFetchError(error);
    }

    if (!relayResponse.ok) {
      return new Non200Response(relayResponse);
    }

    let parsedJsonResponse: unknown;

    try {
      parsedJsonResponse = await relayResponse.json();
    } catch (error) {
      return new NonJsonResponse(relayResponse);
    }

    const parsedSuccessResponse =
      SuccessResponsePayloadSchema.safeParse(parsedJsonResponse);

    if (parsedSuccessResponse.success) {
      return new SuccessResponse(parsedSuccessResponse.data);
    }

    const parsedErrorResponse =
      ErrorResponsePayloadSchema.safeParse(parsedJsonResponse);

    if (parsedErrorResponse.success) {
      return new ErrorResponse(parsedErrorResponse.data);
    }

    return new UnexpectedResponse(parsedJsonResponse);
  }
}
