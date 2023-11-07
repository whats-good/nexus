import { z } from "zod";
import type { Chain } from "../chain/chain";
import type { ServiceProvider } from "../service-provider/service-provider";

// TODO: migrate to the older whatsgood rpc-proxy schema validation,
// based on the input params.
const JsonRPCResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number(),
  result: z.any(),
});

export const JsonRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number(),
  method: z.string(),
  params: z.array(z.any()),
});

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

  public async req(request: z.TypeOf<typeof JsonRPCRequestSchema>) {
    // TODO: add caching for non-mutating requests
    // TODO: test that the payload from the client actually hits the relayed server

    const cleanedRequest = new Request(this.url, {
      body: JSON.stringify(request),
      method: "POST",
    });

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
