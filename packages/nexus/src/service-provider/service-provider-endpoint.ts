import type {
  ErrorResponsePayload,
  RpcRequestPayload,
  SuccessResponsePayload,
} from "../rpc/schemas";
import {
  ErrorResponsePayloadSchema,
  SuccessResponsePayloadSchema,
} from "../rpc/schemas";
import type { Chain } from "../chain";
import type { ServiceProvider } from "./service-provider";

interface RelayResponseBase {
  kind: string;
}

interface InternalFetchError extends RelayResponseBase {
  kind: "internal-fetch-error";
  error: unknown;
}

interface Non200Response extends RelayResponseBase {
  kind: "non-200-response";
  response: Response;
}

interface NonJsonResponse extends RelayResponseBase {
  kind: "non-json-response";
  response: Response;
}

interface SuccessResponse extends RelayResponseBase {
  kind: "success-response";
  response: SuccessResponsePayload;
}

interface ErrorResponse extends RelayResponseBase {
  kind: "error-response";
  response: ErrorResponsePayload;
}

interface UnexpectedResponse extends RelayResponseBase {
  kind: "unexpected-response";
  response: unknown;
}

type RelayResponse =
  | InternalFetchError
  | Non200Response
  | NonJsonResponse
  | SuccessResponse
  | ErrorResponse
  | UnexpectedResponse;

export class ServiceProviderEndpoint {
  constructor(
    public readonly serviceProvider: ServiceProvider,
    public readonly chain: Chain,
    public readonly url: string
  ) {}

  public async relay(request: RpcRequestPayload): Promise<RelayResponse> {
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
      return {
        kind: "internal-fetch-error",
        error,
      } as const;
    }

    if (!relayResponse.ok) {
      return {
        kind: "non-200-response",
        response: relayResponse,
      } as const;
    }

    let parsedJsonResponse: unknown;

    try {
      parsedJsonResponse = (await relayResponse.json()) as unknown;
    } catch (error) {
      return {
        kind: "non-json-response",
        response: relayResponse,
      } as const;
    }

    const parsedSuccessResponse =
      SuccessResponsePayloadSchema.safeParse(parsedJsonResponse);

    if (parsedSuccessResponse.success) {
      return {
        kind: "success-response",
        response: parsedSuccessResponse.data,
      } as const;
    }

    const parsedErrorResponse =
      ErrorResponsePayloadSchema.safeParse(parsedJsonResponse);

    if (parsedErrorResponse.success) {
      return {
        kind: "error-response",
        response: parsedErrorResponse.data,
      } as const;
    }

    return {
      kind: "unexpected-response",
      response: parsedJsonResponse,
    } as const;
  }
}
