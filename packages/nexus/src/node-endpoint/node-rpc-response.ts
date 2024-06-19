import type {
  RpcResponseErrorPayloadType,
  RpcResponseSuccessPayloadType,
  RpcRequestPayloadType,
} from "@src/rpc-schema";

abstract class NodeRpcResponseBase<K extends string, T> {
  public readonly request: RpcRequestPayloadType;
  public abstract readonly kind: K;
  public readonly response: T;

  constructor(params: { request: RpcRequestPayloadType; response: T }) {
    this.request = params.request;
    this.response = params.response;
  }
}

export class NodeRpcResponseInternalFetchError extends NodeRpcResponseBase<
  "internal-fetch-error",
  null
> {
  public readonly kind = "internal-fetch-error";

  constructor(params: { request: RpcRequestPayloadType }) {
    super({ request: params.request, response: null });
  }
}

export class NodeRpcResponseNon200Response extends NodeRpcResponseBase<
  "non-200-response",
  Response
> {
  public readonly kind = "non-200-response";

  constructor(params: { request: RpcRequestPayloadType; response: Response }) {
    super({ request: params.request, response: params.response });
  }
}

export class NodeRpcResponseNonJsonResponse extends NodeRpcResponseBase<
  "non-json-response",
  Response
> {
  public readonly kind = "non-json-response";

  constructor(params: { request: RpcRequestPayloadType; response: Response }) {
    super({ request: params.request, response: params.response });
  }
}

export class NodeRpcResponseSuccess extends NodeRpcResponseBase<
  "success-rpc-response",
  RpcResponseSuccessPayloadType
> {
  public readonly kind = "success-rpc-response";

  constructor(params: {
    request: RpcRequestPayloadType;
    response: RpcResponseSuccessPayloadType;
  }) {
    super({ request: params.request, response: params.response });
  }
}

export class NodeRpcResponseError extends NodeRpcResponseBase<
  "error-rpc-response",
  RpcResponseErrorPayloadType
> {
  public readonly kind = "error-rpc-response";

  constructor(params: {
    request: RpcRequestPayloadType;
    response: RpcResponseErrorPayloadType;
  }) {
    super({ request: params.request, response: params.response });
  }
}

export class NodeRpcResponseUnknown extends NodeRpcResponseBase<
  "unknown-rpc-response",
  unknown
> {
  public readonly kind = "unknown-rpc-response";

  constructor(params: { request: RpcRequestPayloadType; response: unknown }) {
    super({ request: params.request, response: params.response });
  }
}

export type NodeRpcResponseFailure =
  | NodeRpcResponseInternalFetchError
  | NodeRpcResponseNon200Response
  | NodeRpcResponseNonJsonResponse
  | NodeRpcResponseError
  | NodeRpcResponseUnknown;

export type NodeRpcResponse = NodeRpcResponseSuccess | NodeRpcResponseFailure;
