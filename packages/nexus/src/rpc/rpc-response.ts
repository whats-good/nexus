import type { RelayLegalErrorResponse } from "@src/rpc-endpoint";
import type { RpcRequest } from "./rpc-request";
import type {
  ErrorResponsePayload,
  BaseSuccessResponsePayload,
} from "./schemas";

export abstract class RpcResponse<T = unknown> {
  public abstract readonly kind: string;
  public abstract readonly httpStatusCode: number;
  public abstract readonly id: string | number | null;
  public abstract build(): T;

  public static fromRelayLegalErrorResponse(
    request: RpcRequest,
    relayResult: RelayLegalErrorResponse
  ): RpcErrorResponse {
    const { error } = relayResult.response;

    if (error.code === -32601) {
      return request.toMethodNotFoundErrorResponse();
    } else if (error.code === -32602) {
      return request.toInvalidParamsErrorResponse();
    } else if (error.code === -32603) {
      return request.toInternalErrorResponse();
    } else if (error.code === -32700) {
      return request.toParseErrorResponse();
    } else if (error.code === -32600) {
      return request.toInvalidRequestErrorResponse();
    }

    return request.toNonStandardErrorResponse(error.code, error.message);
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
  public abstract readonly code: number;
  public abstract readonly message: string;
  public abstract isStandardErrorResponse: boolean;

  public build(): ErrorResponsePayload {
    return {
      id: this.id,
      jsonrpc: "2.0",
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

export class ParseErrorResponse extends RpcErrorResponse {
  public readonly kind = "parse-error";
  public readonly httpStatusCode = 500;
  public readonly code = -32700;
  public readonly message = "Parse error";
  public readonly id = null;
  public readonly isStandardErrorResponse = true;
}

export class InvalidRequestErrorResponse extends RpcErrorResponse {
  public readonly kind = "invalid-request";
  public readonly httpStatusCode = 400;
  public readonly code = -32600;
  public readonly message = "Invalid Request";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class MethodNotFoundErrorResponse extends RpcErrorResponse {
  public readonly kind = "method-not-found";
  public readonly httpStatusCode = 404;
  public readonly code = -32601;
  public readonly message = "Method not found";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InvalidParamsErrorResponse extends RpcErrorResponse {
  public readonly kind = "invalid-params";
  public readonly httpStatusCode = 500;
  public readonly code = -32602;
  public readonly message = "Invalid params";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InternalErrorResponse extends RpcErrorResponse {
  public readonly kind = "internal-error";
  public readonly httpStatusCode = 500;
  public readonly code = -32603;
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
    public readonly code: number,
    public readonly message: string
  ) {
    super();
  }
}

abstract class NexusCustomErrorResponse extends RpcResponse<ErrorResponsePayload> {
  public readonly isStandardErrorResponse = false;
  public readonly isCustomNexusErrorResponse = true;
}

export class MethodDeniedCustomErrorResponse extends NexusCustomErrorResponse {
  public readonly kind = "method-denied";
  public readonly httpStatusCode = 403;
  constructor(public readonly id: string | number | null) {
    super();
  }

  public build(): ErrorResponsePayload {
    return {
      id: this.id,
      jsonrpc: "2.0",
      error: {
        code: -32020,
        message: "Method denied",
      },
    };
  }
}
