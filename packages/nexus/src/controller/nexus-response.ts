import { Response } from "@whatwg-node/fetch";

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

export abstract class NexusTextResponse extends NexusResponse<string> {
  public buildResponse(): Response {
    return new Response(this.body(), {
      status: this.httpStatusCode,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

export class NexusNotFoundResponse extends NexusTextResponse {
  public readonly httpStatusCode = 404;
  public readonly id = null;

  public body(): string {
    return "Not Found";
  }
}

export class NexusInternalServerErrorResponse extends NexusTextResponse {
  public readonly httpStatusCode = 500;
  public readonly id = null;

  public body(): string {
    return "Internal Server Error";
  }
}

export class NexusBadRequestResponse extends NexusTextResponse {
  public readonly httpStatusCode = 400;
  public readonly id = null;

  public body(): string {
    return "Bad Request";
  }
}
