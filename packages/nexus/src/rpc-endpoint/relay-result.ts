import type {
  ErrorResponsePayload,
  SuccessResponsePayload,
} from "@src/rpc/schemas";
import { safeJsonStringify } from "@src/utils";

abstract class RelayResultBase {
  public abstract readonly kind: string;

  public stringify(): string {
    return safeJsonStringify(this, null, 2);
  }
}

export class InternalFetchError extends RelayResultBase {
  public readonly kind = "internal-fetch-error";

  constructor(public readonly error: unknown) {
    super();
  }
}

export class Non200Response extends RelayResultBase {
  public readonly kind = "non-200-response";

  constructor(public readonly response: Response) {
    super();
  }
}

export class NonJsonResponse extends RelayResultBase {
  public readonly kind = "non-json-response";

  constructor(public readonly response: Response) {
    super();
  }
}

export class SuccessResponse extends RelayResultBase {
  public readonly kind = "success-response";

  constructor(public readonly response: SuccessResponsePayload) {
    super();
  }
}

export class ErrorResponse extends RelayResultBase {
  public readonly kind = "error-response";

  constructor(public readonly response: ErrorResponsePayload) {
    super();
  }
}

export class UnexpectedResponse extends RelayResultBase {
  public readonly kind = "unexpected-response";

  constructor(public readonly response: unknown) {
    super();
  }
}

export type RelayResult =
  | InternalFetchError
  | Non200Response
  | NonJsonResponse
  | SuccessResponse
  | ErrorResponse
  | UnexpectedResponse;
