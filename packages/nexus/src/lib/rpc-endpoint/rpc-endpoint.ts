import type { Chain } from "../chain/chain";
import type { ServiceProvider } from "../service-provider/service-provider";
import type { JsonRPCRequest } from "./json-rpc-types";
import { JsonRPCResponseSchema } from "./json-rpc-types";

export class RpcEndpoint {
  public readonly url: string;
  public readonly chain: Chain;
  public readonly provider: ServiceProvider;

  constructor(params: {
    url: string;
    chain: Chain;
    provider: ServiceProvider;
  }) {
    const { url, chain } = params;

    this.url = url;
    this.chain = chain;
    this.provider = params.provider;
  }

  public async isUp(): Promise<boolean> {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
          id: 1,
        }),
      });

      // TODO: check for the parsed response

      return response.ok;
    } catch (e) {
      console.warn("provider.isUp returned error", e);

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

    console.info(`Attempting relay to Provider: ${this.provider.name}`);

    let relayResponse: Response;

    try {
      relayResponse = await fetch(cleanedRequest);
    } catch (error) {
      console.error(error);

      return {
        type: "fetch-failed",
        request: cleanedRequest,
        error,
      } as const;
    }

    if (!relayResponse.ok) {
      return {
        type: "request-failed",
        request: cleanedRequest,
        result: relayResponse,
      } as const;
    }

    let json: unknown;

    try {
      json = await relayResponse.json();
    } catch (error) {
      console.error("provider failure", error);

      // TODO: i should have different error logging for errors that are caught,
      // or not caught.

      return {
        type: "invalid-json",
        request: cleanedRequest,
        result: relayResponse,
        error,
      } as const;
    }

    const parsedResult = JsonRPCResponseSchema.safeParse(json);

    if (!parsedResult.success) {
      return {
        type: "invalid-json-rpc-response",
        request: cleanedRequest,
        result: relayResponse,
        json,
      } as const;
    }

    return {
      type: "success",
      request: cleanedRequest,
      data: parsedResult.data,
    } as const;
  }
}
