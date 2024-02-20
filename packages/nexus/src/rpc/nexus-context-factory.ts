import { NexusContext } from "./nexus-context";
import {
  ChainDeniedCustomErrorResponse,
  InvalidParamsErrorResponse,
  InvalidRequestErrorResponse,
  MethodNotFoundErrorResponse,
  ParseErrorResponse,
  RpcErrorResponse,
  RpcResponse,
} from "./rpc-response";
import { RpcRequest, UnknownRpcRequest } from "./rpc-request";
import { RpcRequestPayloadSchema } from "./schemas";
import { Container } from "@src/dependency-injection";

export class NexusContextFactory<TServerContext> {
  constructor(private readonly container: Container<TServerContext>) {}

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

    const rpcMethod = this.container.rpcMethodRegistry.get(
      parsedBasePayload.data.method
    );

    if (!rpcMethod) {
      return {
        kind: "error",
        rpcResponse: new MethodNotFoundErrorResponse(
          parsedBasePayload.data.id || null
        ),
      };
    }

    const parsedStrictPayload =
      rpcMethod.requestPayloadSchema.safeParse(jsonPayload);

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
      rpcRequest: new RpcRequest(rpcMethod, parsedBasePayload.data),
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

    const chain = this.container.chainRegistry.getChain(pathParams.chainId);
    if (!chain) {
      return {
        response: new ChainDeniedCustomErrorResponse(responseId),
        kind: "rpc-response",
      };
    }

    const context = new NexusContext({
      request: rpcRequest,
      chain,
      serverContext: this.container.serverContext,
      container: this.container,
      eventBus: this.container.eventBus,
    });
    return {
      kind: "success",
      context,
    };
  }
}
