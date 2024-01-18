interface BaseResponsePayload {
  id: string | number | null;
  jsonrpc: "2.0";
}

export abstract class RpcResponse<T extends BaseResponsePayload> {
  public abstract readonly httpStatusCode: number;
  public abstract readonly id: string | number | null;
  public abstract build(): T;
}

interface ErrorResponsePayload extends BaseResponsePayload {
  error: {
    code: number;
    message: string;
  };
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
  public readonly httpStatusCode = 500;
  public readonly code = -32700;
  public readonly message = "Parse error";
  public readonly id = null;
}

export class InvalidRequest extends RpcErrorResponse {
  public readonly httpStatusCode = 400;
  public readonly code = -32600;
  public readonly message = "Invalid Request";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class MethodNotFound extends RpcErrorResponse {
  public readonly httpStatusCode = 404;
  public readonly code = -32601;
  public readonly message = "Method not found";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InvalidParams extends RpcErrorResponse {
  public readonly httpStatusCode = 500;
  public readonly code = -32602;
  public readonly message = "Invalid params";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InternalError extends RpcErrorResponse {
  public readonly httpStatusCode = 500;
  public readonly code = -32603;
  public readonly message = "Internal error";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

interface SuccessResponsePayload<R = unknown> extends BaseResponsePayload {
  result: R;
}

export class RpcSuccessResponse<R> extends RpcResponse<SuccessResponsePayload> {
  public readonly httpStatusCode = 200;
  constructor(
    public readonly id: string | number | null,
    public readonly result: SuccessResponsePayload<R>
  ) {
    super();
  }

  public build(): SuccessResponsePayload<R> {
    return this.result;
  }
}
