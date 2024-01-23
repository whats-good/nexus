import type { RelayLegalErrorResponse } from "@src/rpc-endpoint";
import type { RpcRequest } from "./rpc-request";
import type { ErrorResponsePayload, SuccessResponsePayload } from "./schemas";

export abstract class RpcResponse<T> {
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
      return request.toMethodNotFoundError();
    } else if (error.code === -32602) {
      return request.toInvalidParamsError();
    } else if (error.code === -32603) {
      return request.toInternalError();
    } else if (error.code === -32700) {
      return request.toParseError();
    } else if (error.code === -32600) {
      return request.toInvalidRequestError();
    }

    return request.toNonStandardError(error.code, error.message);
  }
}

export class RpcSuccessResponse extends RpcResponse<SuccessResponsePayload> {
  public readonly kind = "success-response";
  public readonly httpStatusCode = 200;
  constructor(
    public readonly id: string | number | null,
    public readonly result: unknown
  ) {
    super();
  }

  public build(): SuccessResponsePayload {
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

export class ParseError extends RpcErrorResponse {
  public readonly kind = "parse-error";
  public readonly httpStatusCode = 500;
  public readonly code = -32700;
  public readonly message = "Parse error";
  public readonly id = null;
}

export class InvalidRequestError extends RpcErrorResponse {
  public readonly kind = "invalid-request";
  public readonly httpStatusCode = 400;
  public readonly code = -32600;
  public readonly message = "Invalid Request";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class MethodNotFoundError extends RpcErrorResponse {
  public readonly kind = "method-not-found";
  public readonly httpStatusCode = 404;
  public readonly code = -32601;
  public readonly message = "Method not found";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InvalidParamsError extends RpcErrorResponse {
  public readonly kind = "invalid-params";
  public readonly httpStatusCode = 500;
  public readonly code = -32602;
  public readonly message = "Invalid params";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InternalError extends RpcErrorResponse {
  public readonly kind = "internal-error";
  public readonly httpStatusCode = 500;
  public readonly code = -32603;
  public readonly message = "Internal error";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class NonStandardError extends RpcErrorResponse {
  public readonly kind = "non-standard-error";
  public readonly httpStatusCode = 500;
  constructor(
    public readonly id: string | number | null,
    public readonly code: number,
    public readonly message: string
  ) {
    super();
  }
}
