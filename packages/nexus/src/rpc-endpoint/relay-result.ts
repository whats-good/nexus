import type {
  ErrorResponsePayload,
  SuccessResponsePayload,
} from "@src/rpc/schemas";
import { safeJsonStringify } from "@src/utils";

abstract class RelayReultBase {
  public abstract readonly kind: string;

  public stringify(): string {
    return safeJsonStringify(this, null, 2);
  }
}

export class InternalFetchError extends RelayReultBase {
  public readonly kind = "internal-fetch-error";

  constructor(public readonly error: unknown) {
    super();
  }
}

export class Non200Response extends RelayReultBase {
  public readonly kind = "non-200-response";

  constructor(public readonly response: Response) {
    super();
  }
}

export class NonJsonResponse extends RelayReultBase {
  public readonly kind = "non-json-response";

  constructor(public readonly response: Response) {
    super();
  }
}

export class SuccessResponse extends RelayReultBase {
  public readonly kind = "success-response";

  constructor(public readonly response: SuccessResponsePayload) {
    super();
  }
}

export class ErrorResponse extends RelayReultBase {
  public readonly kind = "error-response";

  constructor(public readonly response: ErrorResponsePayload) {
    super();
  }
}

export class UnexpectedResponse extends RelayReultBase {
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
