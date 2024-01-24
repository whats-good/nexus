import type { RpcRequestPayload } from "../rpc/schemas";
import {
  ErrorResponsePayloadSchema,
  BaseSuccessResponsePayloadSchema,
} from "../rpc/schemas";
import type { Chain } from "../chain";
import type { ServiceProvider } from "../service-provider/service-provider";
import {
  RelayInternalFetchError,
  RelayNon200Response,
  RelayNonJsonResponse,
  RelaySuccessResponse,
  type RelayResult,
  RelayLegalErrorResponse,
  RelayUnexpectedResponse,
} from "./relay-result";

export class RpcEndpoint {
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
      return new RelayInternalFetchError(error);
    }

    if (!relayResponse.ok) {
      return new RelayNon200Response(relayResponse);
    }

    let parsedJsonResponse: unknown;

    try {
      parsedJsonResponse = await relayResponse.json();
    } catch (error) {
      return new RelayNonJsonResponse(relayResponse);
    }

    const parsedSuccessResponse =
      BaseSuccessResponsePayloadSchema.safeParse(parsedJsonResponse);

    if (parsedSuccessResponse.success) {
      return new RelaySuccessResponse(parsedSuccessResponse.data);
    }

    const parsedErrorResponse =
      ErrorResponsePayloadSchema.safeParse(parsedJsonResponse);

    if (parsedErrorResponse.success) {
      return new RelayLegalErrorResponse(parsedErrorResponse.data);
    }

    return new RelayUnexpectedResponse(parsedJsonResponse);
  }
}
