import { Response } from "@whatwg-node/fetch";
import type { Chain } from "@src/chain";

export abstract class NexusResponse<T = unknown> {
  public abstract readonly httpStatusCode: number;
  public abstract readonly id: string | number | null;
  public abstract body(): T;

  public abstract buildResponse(): Response;
}

export abstract class NexusJsonResponse<T = unknown> extends NexusResponse<T> {
  public buildResponse(): Response {
    return new Response(JSON.stringify(this.body()), {
      status: this.httpStatusCode,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export class NexusNotFoundResponse extends NexusJsonResponse {
  public readonly httpStatusCode = 404;
  public readonly id = null;

  public body(): string {
    return "Not Found";
  }
}

export class NexusInternalServerErrorResponse extends NexusJsonResponse {
  public readonly httpStatusCode = 500;
  public readonly id = null;

  public body(): string {
    return "Internal Server Error";
  }
}

export class NexusBadRequestResponse extends NexusJsonResponse {
  public readonly httpStatusCode = 400;
  public readonly id = null;

  public body(): string {
    return "Bad Request";
  }
}

export class ChainNotFoundErrorResponse extends NexusJsonResponse {
  public readonly httpStatusCode = 404;
  public readonly id = null;
  public readonly chainId: number;

  constructor(chainId: number) {
    super();
    this.chainId = chainId;
  }

  public body(): string {
    return `Chain not found for chain id: ${this.chainId}`;
  }
}

export class ProviderNotConfiguredErrorResponse extends NexusJsonResponse {
  public readonly httpStatusCode = 400;
  public readonly id = null;
  public readonly chain: Chain;

  constructor(chain: Chain) {
    super();
    this.chain = chain;
  }

  public body(): string {
    return `Provider not configured for chain id: ${this.chain.chainId}`;
  }
}

// export class ChainDeniedCustomErrorResponse extends NexusCustomErrorResponse {
//   public readonly httpStatusCode = 403;
//   public readonly errorCode = -32021;
//   public readonly message = "Chain denied";
//   constructor(public readonly id: string | number | null) {
//     super();
//   }
// }
