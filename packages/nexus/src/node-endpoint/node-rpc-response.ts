import type {
  RpcResponseErrorPayloadType,
  RpcResponseSuccessPayloadType,
  RpcRequestPayloadType,
} from "@src/rpc-schema";
import type { NodeEndpoint } from "./node-endpoint";

abstract class NodeRpcResponseBase<K extends string, T> {
  public readonly request: RpcRequestPayloadType;
  public abstract readonly kind: K;
  public readonly response: T;
  public readonly endpoint: NodeEndpoint;

  constructor(params: {
    request: RpcRequestPayloadType;
    response: T;
    endpoint: NodeEndpoint;
  }) {
    this.request = params.request;
    this.response = params.response;
    this.endpoint = params.endpoint;
  }
}

export class NodeRpcResponseInternalFetchError extends NodeRpcResponseBase<
  "internal-fetch-error",
  null
> {
  public readonly kind = "internal-fetch-error";
  public readonly error: unknown;

  constructor(params: {
    request: RpcRequestPayloadType;
    endpoint: NodeEndpoint;
    error: unknown;
  }) {
    super({
      request: params.request,
      response: null,
      endpoint: params.endpoint,
    });
    this.error = params.error;
  }
}

export class NodeRpcResponseNon200Response extends NodeRpcResponseBase<
  "non-200-response",
  Response
> {
  public readonly kind = "non-200-response";

  constructor(params: {
    request: RpcRequestPayloadType;
    response: Response;
    endpoint: NodeEndpoint;
  }) {
    super({
      request: params.request,
      response: params.response,
      endpoint: params.endpoint,
    });
  }
}

export class NodeRpcResponseNonJsonResponse extends NodeRpcResponseBase<
  "non-json-response",
  Response
> {
  public readonly kind = "non-json-response";

  constructor(params: {
    request: RpcRequestPayloadType;
    response: Response;
    endpoint: NodeEndpoint;
  }) {
    super({
      request: params.request,
      response: params.response,
      endpoint: params.endpoint,
    });
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
    endpoint: NodeEndpoint;
  }) {
    super({
      request: params.request,
      response: params.response,
      endpoint: params.endpoint,
    });
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
    endpoint: NodeEndpoint;
  }) {
    super({
      request: params.request,
      response: params.response,
      endpoint: params.endpoint,
    });
  }
}

export class NodeRpcResponseUnknown extends NodeRpcResponseBase<
  "unknown-rpc-response",
  unknown
> {
  public readonly kind = "unknown-rpc-response";

  constructor(params: {
    request: RpcRequestPayloadType;
    response: unknown;
    endpoint: NodeEndpoint;
  }) {
    super({
      request: params.request,
      response: params.response,
      endpoint: params.endpoint,
    });
  }
}

export type NodeRpcResponseFailure =
  | NodeRpcResponseInternalFetchError
  | NodeRpcResponseNon200Response
  | NodeRpcResponseNonJsonResponse
  | NodeRpcResponseError
  | NodeRpcResponseUnknown;

export type NodeRpcResponse = NodeRpcResponseSuccess | NodeRpcResponseFailure;
