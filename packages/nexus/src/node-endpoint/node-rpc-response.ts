import type { Logger } from "pino";
import type {
  RpcResponseErrorPayloadType,
  RpcResponseSuccessPayloadType,
  RpcRequestPayloadType,
} from "@src/rpc-schema";
import { safeJsonStringify } from "@src/utils";
import type { NodeEndpoint } from "./node-endpoint";

abstract class NodeRpcResponseBase<K extends string, T> {
  public readonly request: RpcRequestPayloadType;
  public abstract readonly kind: K;
  public readonly response: T;
  public readonly endpoint: NodeEndpoint;
  protected abstract readonly logLevel: "info" | "warn" | "debug" | "error";

  constructor(params: {
    request: RpcRequestPayloadType;
    response: T;
    endpoint: NodeEndpoint;
  }) {
    this.request = params.request;
    this.response = params.response;
    this.endpoint = params.endpoint;
  }

  protected abstract summarize(): string;

  public log(logger: Logger) {
    const message = this.summarize();

    logger[this.logLevel](message);
  }
}

export class NodeRpcResponseInternalFetchError extends NodeRpcResponseBase<
  "internal-fetch-error",
  null
> {
  public readonly kind = "internal-fetch-error";
  public readonly error: unknown;
  protected readonly logLevel = "error";

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

  protected summarize() {
    return safeJsonStringify({
      message: `Internal fetch error while using <${this.endpoint.nodeProvider.name}>`,
      request: this.request,
      error: this.error,
    });
  }
}

export class NodeRpcResponseNon200Response extends NodeRpcResponseBase<
  "non-200-response",
  Response
> {
  public readonly kind = "non-200-response";
  protected readonly logLevel = "warn";

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

  protected summarize() {
    return safeJsonStringify({
      message: `Non-200 response from <${this.endpoint.nodeProvider.name}>`,
      request: this.request,
      response: this.response,
    });
  }
}

export class NodeRpcResponseNonJsonResponse extends NodeRpcResponseBase<
  "non-json-response",
  Response
> {
  public readonly kind = "non-json-response";
  protected readonly logLevel = "warn";

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

  protected summarize() {
    return safeJsonStringify({
      message: `Non-JSON response from <${this.endpoint.nodeProvider.name}>`,
      request: this.request,
      response: this.response,
    });
  }
}

export class NodeRpcResponseSuccess extends NodeRpcResponseBase<
  "success-rpc-response",
  RpcResponseSuccessPayloadType
> {
  public readonly kind = "success-rpc-response";
  protected readonly logLevel = "info";

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

  protected summarize() {
    return safeJsonStringify({
      message: `Success response from <${this.endpoint.nodeProvider.name}>`,
      request: this.request,
      response: this.response,
    });
  }
}

export class NodeRpcResponseError extends NodeRpcResponseBase<
  "error-rpc-response",
  RpcResponseErrorPayloadType
> {
  public readonly kind = "error-rpc-response";
  protected readonly logLevel = "warn";

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

  protected summarize() {
    return safeJsonStringify({
      message: `Error response from <${this.endpoint.nodeProvider.name}>`,
      request: this.request,
      response: this.response,
    });
  }
}

export class NodeRpcResponseUnknown extends NodeRpcResponseBase<
  "unknown-rpc-response",
  unknown
> {
  public readonly kind = "unknown-rpc-response";
  protected readonly logLevel = "warn";

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

  protected summarize() {
    return safeJsonStringify({
      message: `Unknown response from <${this.endpoint.nodeProvider.name}>`,
      request: this.request,
      response: this.response,
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
