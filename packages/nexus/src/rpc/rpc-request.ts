import type { UnknownRpcMethodDescriptor } from "../rpc-method-desciptor";
import {
  InternalErrorResponse,
  InvalidParamsErrorResponse,
  InvalidRequestErrorResponse,
  MethodDeniedCustomErrorResponse,
  MethodNotFoundErrorResponse,
  NonStandardErrorResponse,
  ParseErrorResponse,
} from "./rpc-response";
import type { RpcRequestPayload } from "./schemas";

export abstract class RpcRequestBase {
  public abstract readonly kind: string;

  constructor(
    public readonly rawPayload: unknown,
    public readonly id?: string | number | null
  ) {}

  public getResponseId(): string | number | null {
    return this.id ?? null;
  }

  public toParseErrorResponse(): ParseErrorResponse {
    return new ParseErrorResponse();
  }

  public toInvalidRequestErrorResponse(): InvalidRequestErrorResponse {
    return new InvalidRequestErrorResponse(this.getResponseId());
  }

  public toMethodNotFoundErrorResponse(): MethodNotFoundErrorResponse {
    return new MethodNotFoundErrorResponse(this.getResponseId());
  }

  public toInvalidParamsErrorResponse(): InvalidParamsErrorResponse {
    return new InvalidParamsErrorResponse(this.getResponseId());
  }

  public toInternalErrorResponse(): InternalErrorResponse {
    return new InternalErrorResponse(this.getResponseId());
  }

  public toNonStandardErrorResponse(
    code: number,
    message: string
  ): NonStandardErrorResponse {
    return new NonStandardErrorResponse(this.getResponseId(), code, message);
  }

  public toMethodDeniedCustomErrorResponse(): MethodDeniedCustomErrorResponse {
    return new MethodDeniedCustomErrorResponse(this.getResponseId());
  }
}

export class RpcRequestWithParseError extends RpcRequestBase {
  public readonly kind = "parse-error";
  constructor(public readonly rawPayload: unknown) {
    super(rawPayload);
  }
}

export class RpcRequestWithInvalidRequestError extends RpcRequestBase {
  public readonly kind = "invalid-request";
  constructor(public readonly rawPayload: unknown) {
    super(rawPayload);
  }
}

export class RpcRequestWithMethodNotFoundError extends RpcRequestBase {
  public readonly kind = "method-not-found";
  constructor(
    public readonly rawPayload: unknown,
    public readonly id?: string | number | null
  ) {
    super(rawPayload, id);
  }
}

export class RpcRequestWithInvalidParamsError extends RpcRequestBase {
  public readonly kind = "invalid-params";
  constructor(
    public readonly rawPayload: unknown,
    public readonly methodDescriptor: UnknownRpcMethodDescriptor,
    public readonly id?: string | number | null
  ) {
    super(rawPayload, id);
  }
}

export class RpcRequestWithValidPayload extends RpcRequestBase {
  public readonly kind = "valid-payload";
  constructor(
    public readonly rawPayload: unknown,
    public readonly methodDescriptor: UnknownRpcMethodDescriptor,
    public readonly parsedPayload: RpcRequestPayload,
    public readonly id?: string | number | null
  ) {
    super(rawPayload, id);
  }
}

export type RpcRequest =
  | RpcRequestWithParseError
  | RpcRequestWithInvalidRequestError
  | RpcRequestWithMethodNotFoundError
  | RpcRequestWithInvalidParamsError
  | RpcRequestWithValidPayload;
