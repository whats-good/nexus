import type { Config } from "../config";
import type { Chain } from "../chain/chain";
import type { ServiceProvider } from "../service-provider/service-provider";
import { JsonRPCRequestSchema, type RpcEndpoint } from "./rpc-endpoint";

export class RpcEndpointPool {
  public readonly chain: Chain;

  // TODO: remove this eligibleServiceWorkers property. the reason this is here is to signal that
  // there are providers that are eligible for the chain, but not
  // configured. However, this should not be this class' responsibility.

  public readonly eligibleServiceProviders: ServiceProvider[];
  public readonly configuredServiceProviders: ServiceProvider[];
  private readonly config: Config;
  private currentServiceProviderIndex = 0;

  constructor(params: {
    chain: Chain;
    eligibleServiceProviders: ServiceProvider[];
    configuredServiceProviders: ServiceProvider[];
    config: Config;
  }) {
    this.chain = params.chain;
    this.eligibleServiceProviders = params.eligibleServiceProviders;
    this.configuredServiceProviders = params.configuredServiceProviders;
    this.config = params.config;
  }

  // TODO: maybe we should allow recycling of endpoints? what if one comes back up?
  // or what if the issue was on the client side?

  // TODO: maybe this function shouldn't exist, or it should be
  // called next() and actually return the next endpoint?
  public advance(): void {
    if (this.hasNext()) {
      this.currentServiceProviderIndex++;
    }
  }

  public get current(): RpcEndpoint | undefined {
    while (this.hasNext()) {
      const provider =
        this.configuredServiceProviders[this.currentServiceProviderIndex];

      const endpoint = provider.getRpcEndpoint(this.chain, this.config);

      if (endpoint) {
        return endpoint;
      }

      this.currentServiceProviderIndex++;
    }
  }

  // not really shows whether there is a next, but whether we should try the next
  public hasNext(): boolean {
    return (
      this.currentServiceProviderIndex < this.configuredServiceProviders.length
    );
  }

  public async isUp(): Promise<boolean> {
    if (this.config.recoveryMode === "none") {
      return (await this.current?.isUp()) || false;
    }

    while (this.hasNext()) {
      if (await this.current?.isUp()) {
        return true;
      }

      this.currentServiceProviderIndex++;
    }

    return false;
  }

  public async relay(request: Request) {
    // we clean the request to remove any non-required pieces
    let payload: unknown;

    try {
      payload = await request.json();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            request,
            error,
          },
          null,
          2
        )
      );

      return {
        type: "invalid-json-request",
        request,
        error,
      } as const;
    }

    const parsedPayload = JsonRPCRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      console.error(parsedPayload.error);

      return {
        type: "invalid-json-rpc-request",
        request,
        payload,
        error: parsedPayload.error,
      } as const;
    }

    // TODO: what should we return if no endpoint is available?
    if (this.config.recoveryMode === "none") {
      return (
        this.current?.req(parsedPayload.data) ??
        new Response(null, { status: 500 })
      );
      // TODO: standardize these Response objects
    }

    const errors = [];

    while (this.hasNext()) {
      const endpoint = this.current;

      if (!endpoint) {
        break;
      }

      const response = await endpoint.req(parsedPayload.data);

      if (response.type === "success") {
        return response;
      }

      errors.push(response);
      this.currentServiceProviderIndex++;
    }

    return {
      type: "all-failed",
      errors,
    } as const;
  }
}
