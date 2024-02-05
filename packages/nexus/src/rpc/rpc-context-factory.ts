import type { Logger } from "@src/logger";
import { RpcContext } from "./rpc-context";
import {
  ChainDeniedCustomErrorResponse,
  InvalidParamsErrorResponse,
  InvalidRequestErrorResponse,
  ParseErrorResponse,
  ProviderNotConfiguredCustomErrorResponse,
  RpcResponse,
} from "./rpc-response";
import { NexusNotFoundResponse } from "@src/controller/nexus-response";
import { NodeProviderRegistry } from "@src/node-provider";
import { ChainRegistry } from "@src/chain";
import {
  RpcRequest,
  RpcRequestWithInvalidParamsError,
  RpcRequestWithInvalidRequestError,
  RpcRequestWithMethodNotFoundError,
  RpcRequestWithParseError,
  RpcRequestWithValidPayload,
} from "./rpc-request";
import { RpcRequestPayloadSchema } from "./schemas";
import { RpcMethodDescriptorRegistry } from "@src/rpc-method-desciptor";
import { RelayFailureConfig, RpcEndpointPool } from "@src/rpc-endpoint";
import { NexusConfig } from "@src/config";

export class RpcContextFactory<TServerContext> {
  private readonly logger: Logger;
  private readonly nodeProviderRegistry: NodeProviderRegistry;
  private readonly chainRegistry: ChainRegistry;
  private readonly rpcMethodRegistry: RpcMethodDescriptorRegistry;
  private readonly relayFailureConfig: RelayFailureConfig;
  private readonly serverContext: TServerContext;

  constructor(args: {
    logger: Logger;
    nodeProviderRegistry: NodeProviderRegistry;
    chainRegistry: ChainRegistry;
    rpcMethodRegistry: RpcMethodDescriptorRegistry;
    relayFailureConfig: RelayFailureConfig;
    serverContext: TServerContext;
  }) {
    this.logger = args.logger;
    this.nodeProviderRegistry = args.nodeProviderRegistry;
    this.chainRegistry = args.chainRegistry;
    this.rpcMethodRegistry = args.rpcMethodRegistry;
    this.relayFailureConfig = args.relayFailureConfig;
    this.serverContext = args.serverContext;
  }

  public static fromConfig<TServerContext>(
    config: NexusConfig<TServerContext>
  ): RpcContextFactory<TServerContext> {
    return new RpcContextFactory({
      logger: config.logger,
      nodeProviderRegistry: config.nodeProviderRegistry,
      chainRegistry: config.chainRegistry,
      rpcMethodRegistry: config.rpcMethodRegistry,
      relayFailureConfig: config.relayFailureConfig,
      serverContext: config.serverContext,
    });
  }

  private async toRpcRequest(request: Request): Promise<RpcRequest> {
    let jsonPayload: unknown;
    try {
      jsonPayload = await request.json();
    } catch (e) {
      return new RpcRequestWithParseError();
    }

    const parsedBasePayload = RpcRequestPayloadSchema.safeParse(jsonPayload);

    if (!parsedBasePayload.success) {
      return new RpcRequestWithInvalidRequestError(jsonPayload);
    }

    const methodDescriptor = this.rpcMethodRegistry.getDescriptorByName(
      parsedBasePayload.data.method
    );

    if (!methodDescriptor) {
      return new RpcRequestWithMethodNotFoundError(parsedBasePayload.data);
    }

    const parsedStrictPayload =
      methodDescriptor.requestPayloadSchema.safeParse(jsonPayload);

    if (!parsedStrictPayload.success) {
      return new RpcRequestWithInvalidParamsError(
        methodDescriptor,
        parsedBasePayload.data
      );
    }

    return new RpcRequestWithValidPayload(
      methodDescriptor,
      parsedBasePayload.data
    );
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
        context: RpcContext<TServerContext>;
      }
  > {
    const rpcRequest = await this.toRpcRequest(request);
    const responseId = rpcRequest.getResponseId();
    if (rpcRequest instanceof RpcRequestWithParseError) {
      return {
        response: new ParseErrorResponse(),
        kind: "rpc-response",
      };
    } else if (rpcRequest instanceof RpcRequestWithInvalidRequestError) {
      return {
        response: new InvalidRequestErrorResponse(responseId),
        kind: "rpc-response",
      };
    } else if (rpcRequest instanceof RpcRequestWithMethodNotFoundError) {
      return {
        response: new NexusNotFoundResponse(),
        kind: "rpc-response",
      };
    } else if (rpcRequest instanceof RpcRequestWithInvalidParamsError) {
      return {
        response: new InvalidParamsErrorResponse(responseId),
        kind: "rpc-response",
      };
    }

    const chain = this.chainRegistry.getChain(pathParams.chainId);
    if (!chain) {
      return {
        response: new ChainDeniedCustomErrorResponse(responseId),
        kind: "rpc-response",
      };
    }
    const endpoints = this.nodeProviderRegistry.getEndpointsForChain(chain);
    if (endpoints.length === 0) {
      return {
        response: new ProviderNotConfiguredCustomErrorResponse(responseId),
        kind: "rpc-response",
      };
    }
    const rpcEndpointPool = new RpcEndpointPool(
      endpoints,
      this.relayFailureConfig,
      this.logger
    );

    const rpcContext = new RpcContext(
      rpcRequest,
      chain,
      rpcEndpointPool,
      this.serverContext
    );
    return {
      kind: "success",
      context: rpcContext,
    };
  }
}
