import {
  RpcMethodDescriptor,
  UnknownRpcMethodDescriptor,
} from "@src/rpc-method-desciptor";
import type { RpcRequestPayload } from "./schemas";

export abstract class RpcRequestBase<T> {
  constructor(public readonly payload: T) {}

  public abstract getResponseId(): string | number | null;
}

export class RpcRequestWithParseError extends RpcRequestBase<null> {
  public kind = "parse-error" as const;

  public getResponseId(): string | number | null {
    return null;
  }

  public constructor() {
    super(null);
  }
}

export class RpcRequestWithInvalidRequestError extends RpcRequestBase<unknown> {
  public kind = "invalid-request" as const;

  public getResponseId(): string | number | null {
    return null;
  }
}

export class RpcRequestWithMethodNotFoundError extends RpcRequestBase<unknown> {
  public kind = "method-not-found" as const;

  public getResponseId(): string | number | null {
    return null;
  }
}

export class RpcRequestWithInvalidParamsError extends RpcRequestBase<unknown> {
  public kind = "invalid-params" as const;

  public getResponseId(): string | number | null {
    return null;
  }

  constructor(
    public readonly methodDescriptor: UnknownRpcMethodDescriptor,
    public readonly payload: RpcRequestPayload
  ) {
    super(payload);
  }
}

export class RpcRequestWithValidPayload<
  M extends string,
  P,
  R,
> extends RpcRequestBase<RpcRequestPayload> {
  public kind = "valid-payload" as const;

  public getResponseId(): string | number | null {
    return this.payload.id || null;
  }

  constructor(
    public readonly methodDescriptor: RpcMethodDescriptor<M, P, R>,
    public readonly payload: RpcRequestPayload
  ) {
    super(payload);
  }
}

export type UnknownValidRpcRequest = RpcRequestWithValidPayload<
  string,
  unknown,
  unknown
>;

export type RpcRequest =
  | RpcRequestWithParseError
  | RpcRequestWithInvalidRequestError
  | RpcRequestWithMethodNotFoundError
  | RpcRequestWithInvalidParamsError
  | UnknownValidRpcRequest;
