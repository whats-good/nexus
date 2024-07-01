import type { Chain } from "@src/chain";
import type { RpcRequestPayloadType } from "@src/rpc-schema";
import type {
  NodeRpcResponseFailure,
  NodeRpcResponseSuccess,
} from "./node-rpc-response";

abstract class NodeEndpointPoolResponseBase<K extends string> {
  public abstract readonly kind: K;
  public readonly request: RpcRequestPayloadType;
  public readonly chain: Chain;

  constructor(params: { chain: Chain; request: RpcRequestPayloadType }) {
    this.chain = params.chain;
    this.request = params.request;
  }
}

export class NodeEndpointPoolSuccessResponse extends NodeEndpointPoolResponseBase<"success"> {
  public readonly kind = "success";

  public readonly success: NodeRpcResponseSuccess;
  public readonly failures: NodeRpcResponseFailure[];

  constructor(params: {
    chain: Chain;
    request: RpcRequestPayloadType;
    success: NodeRpcResponseSuccess;
    failures: NodeRpcResponseFailure[];
  }) {
    super(params);
    this.success = params.success;
    this.failures = params.failures;
  }
}

export class NodeEndpointPoolAllFailedResponse extends NodeEndpointPoolResponseBase<"all-failed"> {
  public readonly kind = "all-failed";

  public readonly failures: NodeRpcResponseFailure[];

  constructor(params: {
    chain: Chain;
    request: RpcRequestPayloadType;
    failures: NodeRpcResponseFailure[];
  }) {
    super(params);
    this.failures = params.failures;
  }
}

export type NodeEndpointPoolResponse =
  | NodeEndpointPoolSuccessResponse
  | NodeEndpointPoolAllFailedResponse;
