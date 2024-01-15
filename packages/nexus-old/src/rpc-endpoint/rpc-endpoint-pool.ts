import { Response } from "@whatwg-node/fetch";
import type { RpcRequestCache } from "@src/cache";
import type {
  MethodDescriptorRegistry,
  UnknownMethodDescriptor,
} from "@src/method-descriptor";
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
  public readonly methodDescriptorRegistry: MethodDescriptorRegistry<any>;

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
    methodDescriptorRegistry: MethodDescriptorRegistry<any>;
  }) {
    this.chain = params.chain;
    this.eligibleServiceProviders = params.eligibleServiceProviders;
    this.configuredServiceProviders = params.configuredServiceProviders;
    this.config = params.config;
    this.logger = this.config.logger;
    this.rpcRequestCache = params.rpcRequestCache;
    this.methodDescriptorRegistry = params.methodDescriptorRegistry;
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

  private async getCannedResponse(chain: Chain, request: JsonRPCRequest) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Need to use the any type here since the generics are impossible to infer from within.
    const methodDescriptor: UnknownMethodDescriptor | undefined =
      this.methodDescriptorRegistry.getDescriptorByName(request.method);

    // TODO: change how this is named. instead of calling it `...config`, find a better name.
    // this problem is due to how the setter for this config is named. (i.e .cannedResponse).
    // the same problem applies for the .cacheConfig property.

    if (!methodDescriptor?.cannedResponse) {
      return undefined;
    }

    const parsedParams = methodDescriptor.paramsSchema.safeParse(
      request.params
    );

    if (!parsedParams.success) {
      this.logger.info(
        `Cache: Invalid params for method ${request.method}: ${parsedParams.error.message}`
      );

      return undefined;
    }

    const cannedResponse: unknown = await methodDescriptor.cannedResponse({
      chain,
      params: parsedParams.data,
    });

    // TODO: extend the canned response mechanism to support "Method Not Allowed".
    // update the api to go beyond "success", and to cover "acceptable" error responses.

    return cannedResponse;
  }

  public async relay(
    methodDescriptor: UnknownMethodDescriptor,
    request: JsonRPCRequest
  ) {
    const parsedParams = methodDescriptor.paramsSchema.safeParse(
      request.params
    );

    if (!parsedParams.success) {
      // TODO: what if the parsing is wrong?
      // TODO: is this where this parsing should happen?
      // if we're exiting our early, maybe params should be parsed before this function is called?
      this.logger.warn(
        `Invalid params for method ${request.method}: ${parsedParams.error.message}`
      );

      return {
        type: "invalid-params",
        request,
        error: parsedParams.error,
      } as const;
    }

    if (!methodDescriptor.requestFilter({ params: parsedParams.data })) {
      this.logger.info(
        `Request filter denied: ${request.method} with params: ${JSON.stringify(
          parsedParams.data,
          null,
          2
        )}`
      );

      return {
        type: "method-not-allowed",
        request,
      } as const;
    }

    try {
      const cannedResponse = await this.getCannedResponse(this.chain, request);

      if (cannedResponse) {
        return {
          // TODO: add a .canned field here.
          type: "success",
          request,
          result: cannedResponse,
        };
      }
    } catch (e) {
      this.logger.warn(
        `Uncaught error in canned response: ${JSON.stringify(e, null, 2)}`
      );
    }

    try {
      const cachedResponse = await this.rpcRequestCache.get(
        this.chain,
        methodDescriptor,
        request
      );

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
    } catch (e) {
      this.logger.warn(
        `Uncaught error in cache: ${JSON.stringify(e, null, 2)}`
      );
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
          await this.rpcRequestCache.set(
            this.chain,
            methodDescriptor,
            request,
            response.result
          );
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
