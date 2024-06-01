import type { Chain } from "@src/chain";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import type { NodeEndpoint } from "./node-endpoint";
import type { NodeRpcResponse } from "./node-rpc-response";

abstract class NodeEndpointPoolResponseBase<K extends string> {
  public abstract readonly kind: K;
  public readonly request: RpcRequestPayloadType;
  public readonly chain: Chain;

  constructor(params: { chain: Chain; request: RpcRequestPayloadType }) {
    this.chain = params.chain;
    this.request = params.request;
  }
}

export class NodeEndpointPoolProviderNotFoundResponse extends NodeEndpointPoolResponseBase<"node-provider-not-found"> {
  public readonly kind = "node-provider-not-found";
}

export class NodeEndpointPoolSuccessResponse extends NodeEndpointPoolResponseBase<"success"> {
  public readonly kind = "success";

  public readonly response: NodeRpcResponse;
  public readonly endpoint: NodeEndpoint;
  public readonly failures: {
    response: NodeRpcResponse;
    endpoint: NodeEndpoint;
  }[];

  constructor(params: {
    chain: Chain;
    request: RpcRequestPayloadType;
    response: NodeRpcResponse;
    endpoint: NodeEndpoint;
    failures: {
      response: NodeRpcResponse;
      endpoint: NodeEndpoint;
    }[];
  }) {
    super(params);
    this.response = params.response;
    this.endpoint = params.endpoint;
    this.failures = params.failures;
  }
}

export class NodeEndpointPoolAllFailedResponse extends NodeEndpointPoolResponseBase<"all-failed"> {
  public readonly kind = "all-failed";

  public readonly failures: {
    response: NodeRpcResponse;
    endpoint: NodeEndpoint;
  }[];

  constructor(params: {
    chain: Chain;
    request: RpcRequestPayloadType;
    failures: {
      response: NodeRpcResponse;
      endpoint: NodeEndpoint;
    }[];
  }) {
    super(params);
    this.failures = params.failures;
  }
}

export type NodeEndpointPoolResponse =
  | NodeEndpointPoolProviderNotFoundResponse
  | NodeEndpointPoolSuccessResponse
  | NodeEndpointPoolAllFailedResponse;
