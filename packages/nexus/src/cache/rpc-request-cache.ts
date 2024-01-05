import { BigNumber } from "@ethersproject/bignumber";
import type {
  JsonRPCRequest,
  JsonRPCResponse,
} from "@src/rpc-endpoint/json-rpc-types";
import type { Chain } from "@src/chain";
import type { Config, Logger } from "../config";
import type {
  AnyMethodDescriptor,
  MethodDescriptorRegistry,
} from "../method-descriptor";

export interface BaseCache {
  get: (key: string) => Promise<unknown>;
  set: (params: { key: string; ttl: number; value: any }) => Promise<void>;
}

// TODO: make set and get methods drier and reuse key generation logic
// TODO: start using an actual cache library + LRU cache

export class RpcRequestCache {
  private readonly logger: Logger;
  constructor(
    public readonly config: Config,
    public readonly methodDescriptorRegistry: MethodDescriptorRegistry<any>,
    public readonly cache: BaseCache
  ) {
    this.logger = this.config.logger;
  }

  public async set(
    chain: Chain,
    request: JsonRPCRequest,
    response: JsonRPCResponse
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Need to use the any type here since the generics are impossible to infer from within.
    const methodDescriptor: AnyMethodDescriptor | undefined =
      this.methodDescriptorRegistry.getDescriptorByName(request.method);

    if (!methodDescriptor) {
      this.logger.info(
        `Cache: No method descriptor found for method ${request.method}`
      );

      return;
    }

    const { cacheConfig } = methodDescriptor;

    if (!cacheConfig?.enabled) {
      this.logger.info(`Cache: Cache is disabled for method ${request.method}`);

      return;
    }

    const parsedParams = methodDescriptor.paramsSchema.safeParse(
      request.params
    );

    if (!parsedParams.success) {
      this.logger.info(
        `Cache: Invalid params for method ${request.method}: ${parsedParams.error.message}`
      );

      return;
    }

    const paramsKeySuffix = cacheConfig.paramsKeySuffix({
      chain,
      methodDescriptor,
      params: parsedParams.data as unknown,
      highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
    });

    const cacheKey = `${chain.chainId}-${request.method}-${paramsKeySuffix}`;

    const parsedResultResponse =
      methodDescriptor.resultResponseSchema.safeParse(response);

    // TODO: consider passing the request as a whole, instead of just the params.
    const ttl = cacheConfig.ttl({
      chain,
      rawResponse: response,
      result: methodDescriptor.resultFromResponse(response),
      error: methodDescriptor.errorFromResponse(response),
      params: parsedParams.data as unknown,
      highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
      methodDescriptor,
    });

    if (!parsedResultResponse.success) {
      // TODO: handle error responses here too
      this.logger.info(
        `Cache: Invalid response result for method ${request.method}: ${
          parsedResultResponse.error.message
        }. ${JSON.stringify(response, null, 2)}`
      );

      return undefined;
    }

    await this.cache.set({
      key: cacheKey,
      ttl,
      value: parsedResultResponse.data.result as unknown,
    });

    this.logger.info(
      `Cache: Cached result for key ${cacheKey}: ${JSON.stringify(
        parsedResultResponse.data.result,
        null,
        2
      )}`
    );
  }

  public async get(
    chain: Chain,
    request: JsonRPCRequest
  ): Promise<JsonRPCResponse | undefined> {
    // TODO: instead of returning | undefined, we should return a typed union
    // object that explains why the cache was not used, e.g.: { reason: "no-cache" }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Need to use the any type here since the generics are impossible to infer from within.
    const methodDescriptor: AnyMethodDescriptor | undefined =
      this.methodDescriptorRegistry.getDescriptorByName(request.method);

    if (!methodDescriptor) {
      this.logger.info(
        `Cache: No method descriptor found for method ${request.method}`
      );

      return undefined;
    }

    const { cacheConfig } = methodDescriptor;

    if (!cacheConfig?.enabled) {
      this.logger.info(`Cache: Cache is disabled for method ${request.method}`);

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

    const paramsKeySuffix = cacheConfig.paramsKeySuffix({
      chain,
      params: parsedParams.data as unknown,
      highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
      methodDescriptor,
    });

    const cacheKey = `${chain.chainId}-${request.method}-${paramsKeySuffix}`;
    const cachedResult = await this.cache.get(cacheKey);

    if (!cachedResult) {
      this.logger.info(`Cache: No cached result for key ${cacheKey}`);

      return undefined;
    }

    const parsedResult = methodDescriptor.resultSchema.safeParse(cachedResult);

    if (!parsedResult.success) {
      this.logger.info(
        `Cache: Invalid cached result for key ${cacheKey}: ${
          parsedResult.error.message
        }. ${JSON.stringify(cachedResult, null, 2)}`
      );

      return undefined;
    }

    this.logger.info(
      `Cache: Returning cached result for key ${cacheKey}: ${JSON.stringify(
        parsedResult.data,
        null,
        2
      )}`
    );

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: parsedResult.data as unknown,
    };
  }
}
