import type {
  RpcResponseErrorPayloadType,
  RpcResponseSuccessPayloadType,
  RpcResponseErrorFieldType,
} from "@src/rpc-schema";
import { NexusJsonResponse } from "@src/http-controller/nexus-response";
import type { NodeProvider } from "@src/node-provider";
import type { Chain } from "@src/chain";

export abstract class RpcResponse<T = unknown> extends NexusJsonResponse<T> {
  public abstract readonly id: string | number | null;
}

export class RpcSuccessResponse extends RpcResponse<RpcResponseSuccessPayloadType> {
  public readonly httpStatusCode = 200;
  constructor(
    public readonly id: string | number | null,
    public readonly result: unknown
  ) {
    super();
  }

  public body(): RpcResponseSuccessPayloadType {
    return {
      id: this.id,
      jsonrpc: "2.0",
      result: this.result,
    };
  }
}

export abstract class RpcErrorResponse extends RpcResponse<RpcResponseErrorPayloadType> {
  public abstract readonly errorCode: number;
  public abstract readonly message: string;
  public abstract isStandardErrorResponse: boolean;

  public static fromErrorResponsePayload(
    error: RpcResponseErrorFieldType,
    id: string | number | null
  ): RpcErrorResponse {
    switch (error.code) {
      case -32601:
        return new MethodNotFoundErrorResponse(id);
      case -32602:
        return new InvalidParamsErrorResponse(id);
      case -32603:
        return new InternalErrorResponse(id);
      case -32700:
        return new ParseErrorResponse();
      case -32600:
        return new InvalidRequestErrorResponse(id);
      default:
        return new NonStandardErrorResponse(id, error.code, error.message);
    }
  }

  public body(): RpcResponseErrorPayloadType {
    return {
      id: this.id,
      jsonrpc: "2.0",
      error: {
        code: this.errorCode,
        message: this.message,
      },
    };
  }
}

export class ParseErrorResponse extends RpcErrorResponse {
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32700;
  public readonly message = "Parse error";
  public readonly id = null;
  public readonly isStandardErrorResponse = true;
}

// TODO: use this at the higher level
export class InvalidRequestErrorResponse extends RpcErrorResponse {
  public readonly httpStatusCode = 400;
  public readonly errorCode = -32600;
  public readonly message = "Invalid Request";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class MethodNotFoundErrorResponse extends RpcErrorResponse {
  public readonly httpStatusCode = 404;
  public readonly errorCode = -32601;
  public readonly message = "Method not found";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InvalidParamsErrorResponse extends RpcErrorResponse {
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32602;
  public readonly message = "Invalid params";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class InternalErrorResponse extends RpcErrorResponse {
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32603;
  public readonly message = "Internal error";
  public readonly isStandardErrorResponse = true;
  constructor(public readonly id: string | number | null) {
    super();
  }
}

export class NonStandardErrorResponse extends RpcErrorResponse {
  public readonly httpStatusCode = 500;
  public readonly isStandardErrorResponse = false;
  constructor(
    public readonly id: string | number | null,
    public readonly errorCode: number,
    public readonly message: string
  ) {
    super();
  }
}

abstract class NexusCustomErrorResponse extends RpcErrorResponse {
  public readonly isStandardErrorResponse = false;
  public readonly isCustomNexusErrorResponse = true;
}

export class ChainNotFoundErrorResponse extends NexusCustomErrorResponse {
  public readonly httpStatusCode = 404;
  public readonly errorCode = -32010;

  constructor(
    public readonly id: string | number | null,
    public readonly chainId: number
  ) {
    super();
  }

  public get message(): string {
    return `Chain not found for chain id: ${this.chainId}`;
  }
}

export class ProviderNotConfiguredErrorResponse extends NexusJsonResponse {
  public readonly httpStatusCode = 400;
  public readonly errorCode = -32011;

  constructor(
    public readonly id: string | number | null,
    public readonly chain: Chain
  ) {
    super();
  }

  public body(): string {
    return `Provider not configured for chain id: ${this.chain.chainId}`;
  }
}

export class NodeProviderReturnedNon200ErrorResponse extends NexusCustomErrorResponse {
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32020;

  constructor(
    public readonly id: string | number | null,
    public readonly nodeProvider: NodeProvider
  ) {
    super();
  }

  // TODO: convert the message fields to be compatible with pino object logging
  public get message(): string {
    return `Node provider (${this.nodeProvider.name}) returned non-200 response.`;
  }
}

export class NodeProviderReturnedInvalidResponse extends NexusCustomErrorResponse {
  public readonly httpStatusCode = 500;
  public readonly errorCode = -32021;

  constructor(
    public readonly id: string | number | null,
    public readonly nodeProvider: NodeProvider
  ) {
    super();
  }

  public get message(): string {
    return `Node provider (${this.nodeProvider.name}) returned invalid response.`;
  }
}

export class UnauthorizedCustomErrorResponse extends NexusCustomErrorResponse {
  public readonly httpStatusCode = 401;
  public readonly errorCode = -32022;
  public readonly message = "Unauthorized";
  constructor(public readonly id: string | number | null) {
    super();
  }
}

// export class MethodDeniedCustomErrorResponse extends NexusCustomErrorResponse {
//   public readonly httpStatusCode = 403;
//   public readonly errorCode = -32023;
//   public readonly message = "Method denied";
//   constructor(public readonly id: string | number | null) {
//     super();
//   }
// }
