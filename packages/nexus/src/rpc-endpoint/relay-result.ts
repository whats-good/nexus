import type {
  ErrorResponsePayload,
  BaseSuccessResponsePayload,
} from "@src/rpc/schemas";
import { safeJsonStringify } from "@src/utils";

abstract class RelayResultBase {
  public abstract readonly kind: string;

  public stringify(): string {
    return safeJsonStringify(this, null, 2);
  }
}

export class RelayInternalFetchError extends RelayResultBase {
  public readonly kind = "internal-fetch-error";

  constructor(public readonly error: unknown) {
    super();
  }
}

export class RelayNon200Response extends RelayResultBase {
  public readonly kind = "non-200-response";

  constructor(public readonly response: Response) {
    super();
  }
}

export class RelayNonJsonResponse extends RelayResultBase {
  public readonly kind = "non-json-response";

  constructor(public readonly response: Response) {
    super();
  }
}

export class RelaySuccessResponse extends RelayResultBase {
  public readonly kind = "success-response";

  constructor(public readonly response: BaseSuccessResponsePayload) {
    super();
  }
}

export class RelayLegalErrorResponse extends RelayResultBase {
  public readonly kind = "error-response";

  constructor(public readonly response: ErrorResponsePayload) {
    super();
  }
}

export class RelayUnexpectedResponse extends RelayResultBase {
  public readonly kind = "unexpected-response";

  constructor(public readonly response: unknown) {
    super();
  }
}

export type RelayResult =
  | RelayInternalFetchError
  | RelayNon200Response
  | RelayNonJsonResponse
  | RelaySuccessResponse
  | RelayLegalErrorResponse
  | RelayUnexpectedResponse;
