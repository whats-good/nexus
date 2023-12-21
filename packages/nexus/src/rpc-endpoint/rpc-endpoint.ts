import { Request, fetch } from "@whatwg-node/fetch";
import type { Logger } from "@src/config";
import type { Chain } from "../chain/chain";
import type { ServiceProvider } from "../service-provider/service-provider";
import type { JsonRPCRequest } from "./json-rpc-types";
import { JsonRPCResponseSchema } from "./json-rpc-types";

export class RpcEndpoint {
  public readonly url: string;
  public readonly chain: Chain;
  public readonly provider: ServiceProvider;
  private readonly logger: Logger;

  constructor(params: {
    url: string;
    chain: Chain;
    provider: ServiceProvider;
    logger: Logger;
  }) {
    const { url, chain } = params;

    this.url = url;
    this.chain = chain;
    this.provider = params.provider;
    this.logger = params.logger;
  }

  public async isUp(): Promise<boolean> {
    try {
      const request = new Request(this.url, {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
          id: 1,
        }),
      });
      const response = await fetch(request);

      // TODO: check for the parsed response

      return response.ok;
    } catch (e) {
      this.logger.warn("provider.isUp returned error: ");
      this.logger.warn(JSON.stringify(e, null, 2));

      return false;
    }
  }

  public async relay(request: JsonRPCRequest) {
    // TODO: add caching for non-mutating requests
    // TODO: test that the payload from the client actually hits the relayed server

    const cleanedRequest = new Request(this.url, {
      body: JSON.stringify(request),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.logger.info(`Attempting relay to Provider: ${this.provider.name}`);

    let relayResponse: Response;

    try {
      relayResponse = await fetch(cleanedRequest);
    } catch (error) {
      this.logger.error(JSON.stringify(error));

      return {
        type: "fetch-failed",
        request,
        error,
      } as const;
    }

    let json: unknown;

    try {
      json = await relayResponse.json();
    } catch (error) {
      this.logger.error("provider failure: ");
      this.logger.error(JSON.stringify(error, null, 2));

      // TODO: i should have different error logging for errors that are caught,
      // or not caught.

      return {
        type: "invalid-json",
        request,
        // relayResponse TODO: should this be relayResponse.text()?
        error,
      } as const;
    }

    if (!relayResponse.ok) {
      return {
        type: "request-failed",
        request,
        relayResponse: json,
      } as const;
    }

    const parsedResult = JsonRPCResponseSchema.safeParse(json);

    if (!parsedResult.success) {
      return {
        type: "invalid-json-rpc-response",
        request,
        relayResponse: json,
      } as const;
    }

    return {
      type: "success",
      request,
      result: parsedResult.data,
    } as const;
  }
}
