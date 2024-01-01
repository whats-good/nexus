import { Response } from "@whatwg-node/fetch";
import type { RpcRequestCache } from "@src/cache";
import type { Config, Logger } from "../config";
import type { Chain } from "../chain/chain";
import type { ServiceProvider } from "../service-provider/service-provider";
import type { JsonRPCRequest } from "./json-rpc-types";
import type { RpcEndpoint } from "./rpc-endpoint";

export class RpcEndpointPool {
  public readonly chain: Chain;

  // TODO: remove this eligibleServiceWorkers property. the reason this is here is to signal that
  // there are providers that are eligible for the chain, but not
  // configured. However, this should not be this class' responsibility.

  public readonly eligibleServiceProviders: ServiceProvider[];
  public readonly configuredServiceProviders: ServiceProvider[];
  private readonly config: Config;
  private currentServiceProviderIndex = 0;
  private readonly logger: Logger;

  private readonly rpcRequestCache: RpcRequestCache;

  constructor(params: {
    chain: Chain;
    eligibleServiceProviders: ServiceProvider[];
    configuredServiceProviders: ServiceProvider[];
    config: Config;
    rpcRequestCache: RpcRequestCache;
  }) {
    this.chain = params.chain;
    this.eligibleServiceProviders = params.eligibleServiceProviders;
    this.configuredServiceProviders = params.configuredServiceProviders;
    this.config = params.config;
    this.logger = this.config.logger;
    this.rpcRequestCache = params.rpcRequestCache;
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

  public async relay(request: JsonRPCRequest) {
    const cachedResponse = await this.rpcRequestCache.get(this.chain, request);

    if (cachedResponse) {
      // TODO: should we do anything to indicate that this was
      // the result of a cache hit?
      return {
        type: "success",
        cached: true,
        request,
        result: cachedResponse,
      };
    }

    // TODO: what should we return if no endpoint is available?
    if (this.config.recoveryMode === "none") {
      return (
        this.current?.relay(request) ?? new Response(null, { status: 500 })
      );
      // TODO: standardize these Response objects
    }

    const errors = [];

    while (this.hasNext()) {
      const endpoint = this.current;

      if (!endpoint) {
        break;
      }

      const response = await endpoint.relay(request);

      if (response.type === "success") {
        try {
          await this.rpcRequestCache.set(this.chain, request, response.result);
        } catch (error) {
          this.logger.error("failed to cache response");
          this.logger.error(JSON.stringify(error, null, 2));
        }

        return response;
      }

      this.logger.warn(
        `Provider: ${endpoint.provider.name} failed to relay request:`
      );
      this.logger.warn(JSON.stringify(response, null, 2));

      errors.push({
        provider: endpoint.provider.name,
        error: response,
      });
      this.currentServiceProviderIndex++;
    }

    return {
      type: "all-failed",
      request,
      errors,
    } as const;
  }
}
