import type {
  ErrorResponsePayload,
  BaseSuccessResponsePayload,
  ErrorField,
} from "./schemas";

export abstract class RpcResponse<T = unknown> {
  public abstract readonly kind: string;
  public abstract readonly httpStatusCode: number;
  public abstract readonly id: string | number | null;
  public abstract build(): T;

  public static fromErrorResponsePayload(
    error: ErrorField,
    id: string | number | null
  ): RpcErrorResponse {
    switch (error.code) {
      case -32601:
        return new MethodNotFoundErrorResponse(id);
      case -32602:
        return new InvalidParamsErrorResponse(id);
      case -32603:
        return new InternalErrorResponse(id);
      case -32700:
        return new ParseErrorResponse();
      case -32600:
        return new InvalidRequestErrorResponse(id);
      default:
        return new NonStandardErrorResponse(id, error.code, error.message);
    }
  }
}

export class RpcSuccessResponse extends RpcResponse<BaseSuccessResponsePayload> {
  public readonly kind = "success-response";
  public readonly httpStatusCode = 200;
  constructor(
    public readonly id: string | number | null,
    public readonly result: unknown
  ) {
    super();
  }

  public build(): BaseSuccessResponsePayload {
    return {
      id: this.id,
      jsonrpc: "2.0",
      result: this.result,
    };
  }
}

abstract class RpcErrorResponse extends RpcResponse<ErrorResponsePayload> {
  public abstract readonly errorCode: number;
  public abstract readonly message: string;
  public abstract isStandardErrorResponse: boolean;

  public build(): ErrorResponsePayload {
    return {
      id: this.id,
      jsonrpc: "2.0",
      error: {
        code: this.errorCode,
        message: this.message,
      },
    };
  }
}

export class ParseErrorResponse extends RpcErrorResponse {
  public readonly kind = "parse-error";
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32700;
  public readonly message = "Parse error";
  public readonly id = null;
  public readonly isStandardErrorResponse = true;
}

export class InvalidRequestErrorResponse extends RpcErrorResponse {
  public readonly kind = "invalid-request";
  public readonly httpStatusCode = 400;
  public readonly errorCode = -32600;
  public readonly message = "Invalid Request";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class MethodNotFoundErrorResponse extends RpcErrorResponse {
  public readonly kind = "method-not-found";
  public readonly httpStatusCode = 404;
  public readonly errorCode = -32601;
  public readonly message = "Method not found";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InvalidParamsErrorResponse extends RpcErrorResponse {
  public readonly kind = "invalid-params";
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32602;
  public readonly message = "Invalid params";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InternalErrorResponse extends RpcErrorResponse {
  public readonly kind = "internal-error";
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32603;
  public readonly message = "Internal error";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class NonStandardErrorResponse extends RpcErrorResponse {
  public readonly kind = "non-standard-error";
  public readonly httpStatusCode = 500;
  public readonly isStandardErrorResponse = false;
  constructor(
    public readonly id: string | number | null,
    public readonly errorCode: number,
    public readonly message: string
  ) {
    super();
  }
}

abstract class NexusCustomErrorResponse extends RpcErrorResponse {
  public readonly isStandardErrorResponse = false;
  public readonly isCustomNexusErrorResponse = true;
}

export class MethodDeniedCustomErrorResponse extends NexusCustomErrorResponse {
  public readonly kind = "method-denied";
  public readonly httpStatusCode = 403;
  public readonly errorCode = -32020;
  public readonly message = "Method denied";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class ChainDeniedCustomErrorResponse extends NexusCustomErrorResponse {
  public readonly kind = "chain-denied";
  public readonly httpStatusCode = 403;
  public readonly errorCode = -32021;
  public readonly message = "Chain denied";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class ProviderNotConfiguredCustomErrorResponse extends NexusCustomErrorResponse {
  public readonly kind = "provider-not-configured";
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32022;
  public readonly message = "Provider not configured";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class BadUrlCustomErrorResponse extends NexusCustomErrorResponse {
  public readonly kind = "bad-url";
  public readonly httpStatusCode = 400;
  public readonly errorCode = -32023;
  public readonly message = "Bad url";
  constructor(public readonly id: string | number | null) {
    super();
  }
}
