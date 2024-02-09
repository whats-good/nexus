import { NexusContext } from "./nexus-context";
import {
  ChainDeniedCustomErrorResponse,
  InvalidParamsErrorResponse,
  InvalidRequestErrorResponse,
  MethodNotFoundErrorResponse,
  ParseErrorResponse,
  ProviderNotConfiguredCustomErrorResponse,
  RpcErrorResponse,
  RpcResponse,
} from "./rpc-response";
import { RpcRequest, UnknownRpcRequest } from "./rpc-request";
import { RpcRequestPayloadSchema } from "./schemas";
import { RpcEndpointPool } from "@src/rpc-endpoint";
import { NexusConfig } from "@src/config";

export class NexusContextFactory<TServerContext> {
  constructor(private readonly config: NexusConfig<TServerContext>) {}

  private async toRpcRequest(request: Request): Promise<
    | {
        kind: "success";
        rpcRequest: UnknownRpcRequest;
      }
    | {
        kind: "error";
        rpcResponse: RpcErrorResponse;
      }
  > {
    let jsonPayload: unknown;
    try {
      jsonPayload = await request.json();
    } catch (e) {
      return {
        kind: "error",
        rpcResponse: new ParseErrorResponse(),
      };
    }

    const parsedBasePayload = RpcRequestPayloadSchema.safeParse(jsonPayload);

    if (!parsedBasePayload.success) {
      return {
        kind: "error",
        rpcResponse: new InvalidRequestErrorResponse(null),
      };
    }

    const methodDescriptor = this.config.rpcMethodRegistry.getDescriptorByName(
      parsedBasePayload.data.method
    );

    if (!methodDescriptor) {
      return {
        kind: "error",
        rpcResponse: new MethodNotFoundErrorResponse(
          parsedBasePayload.data.id || null
        ),
      };
    }

    const parsedStrictPayload =
      methodDescriptor.requestPayloadSchema.safeParse(jsonPayload);

    if (!parsedStrictPayload.success) {
      return {
        kind: "error",
        rpcResponse: new InvalidParamsErrorResponse(
          parsedBasePayload.data.id || null
        ),
      };
    }

    return {
      kind: "success",
      rpcRequest: new RpcRequest(methodDescriptor, parsedBasePayload.data),
    };
  }

  public async from(
    request: Request,
    pathParams: { chainId: number }
  ): Promise<
    | {
        kind: "rpc-response";
        response: RpcResponse;
      }
    | {
        kind: "success";
        context: NexusContext<TServerContext>;
      }
  > {
    const result = await this.toRpcRequest(request);
    if (result.kind === "error") {
      return {
        kind: "rpc-response",
        response: result.rpcResponse,
      };
    }
    const { rpcRequest } = result;
    const responseId = rpcRequest.getResponseId();

    const chain = this.config.chainRegistry.getChain(pathParams.chainId);
    if (!chain) {
      return {
        response: new ChainDeniedCustomErrorResponse(responseId),
        kind: "rpc-response",
      };
    }
    const endpoints =
      this.config.nodeProviderRegistry.getEndpointsForChain(chain);
    if (endpoints.length === 0) {
      return {
        response: new ProviderNotConfiguredCustomErrorResponse(responseId),
        kind: "rpc-response",
      };
    }

    this.config.logger.info("pool created.");
    const rpcEndpointPool = new RpcEndpointPool(
      endpoints,
      this.config.relayFailureConfig,
      this.config.logger
    );

    const context = new NexusContext({
      request: rpcRequest,
      chain,
      rpcEndpointPool,
      serverContext: this.config.serverContext,
      config: this.config,
      eventBus: this.config.eventBus,
    });
    return {
      kind: "success",
      context,
    };
  }
}
