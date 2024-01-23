import type { UnknownRpcMethodDescriptor } from "../rpc-method-desciptor";
import {
  InternalError,
  InvalidParamsError,
  InvalidRequestError,
  MethodNotFoundError,
  NonStandardError,
  ParseError,
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

  public toParseError(): ParseError {
    return new ParseError();
  }

  public toInvalidRequestError(): InvalidRequestError {
    return new InvalidRequestError(this.getResponseId());
  }

  public toMethodNotFoundError(): MethodNotFoundError {
    return new MethodNotFoundError(this.getResponseId());
  }

  public toInvalidParamsError(): InvalidParamsError {
    return new InvalidParamsError(this.getResponseId());
  }

  public toInternalError(): InternalError {
    return new InternalError(this.getResponseId());
  }

  public toNonStandardError(code: number, message: string): NonStandardError {
    return new NonStandardError(this.getResponseId(), code, message);
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
