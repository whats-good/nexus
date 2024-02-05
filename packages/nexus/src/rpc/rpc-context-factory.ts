import type { Logger } from "@src/logger";
import { RpcContext } from "./rpc-context";
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
import { NodeProviderRegistry } from "@src/node-provider";
import { ChainRegistry } from "@src/chain";
import { RpcRequest, UnknownRpcRequest } from "./rpc-request";
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

    const methodDescriptor = this.rpcMethodRegistry.getDescriptorByName(
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
        context: RpcContext<TServerContext>;
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

    this.logger.info("pool created.");
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
