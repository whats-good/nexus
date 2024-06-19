import { Response } from "@whatwg-node/fetch";

export abstract class NexusResponse<T = unknown> {
  public abstract readonly httpStatusCode: number;
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

  public body(): string {
    return "Not Found";
  }
}

export class NexusInternalServerErrorResponse extends NexusJsonResponse {
  public readonly httpStatusCode = 500;

  public body(): string {
    return "Internal Server Error";
  }
}

export class NexusBadRequestResponse extends NexusJsonResponse {
  public readonly httpStatusCode = 400;

  public body(): string {
    return "Bad Request";
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
