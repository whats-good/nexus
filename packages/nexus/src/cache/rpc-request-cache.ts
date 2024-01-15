import { BigNumber } from "@ethersproject/bignumber";
import {
  JsonRPCResponseSchema,
  type JsonRPCRequest,
  type JsonRPCResponse,
} from "@src/rpc-endpoint/json-rpc-types";
import type { Chain } from "@src/chain";
import type { Config, Logger } from "../config";
import type { UnknownMethodDescriptor } from "../method-descriptor";

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
    public readonly cache: BaseCache
  ) {
    this.logger = this.config.logger;
  }

  public async set(
    chain: Chain,
    methodDescriptor: UnknownMethodDescriptor,
    request: JsonRPCRequest,
    response: JsonRPCResponse
  ): Promise<void> {
    if (!this.config.caching.enabled) {
      this.logger.info(
        `Cache: Caching is globally disabled. Not writing to cache.`
      );

      return;
    }

    const { cacheConfig } = methodDescriptor;

    if (!cacheConfig?.writeEnabled) {
      this.logger.info(
        `Cache: Cache write is disabled for method ${request.method}`
      );

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
      params: parsedParams.data,
      highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
    });

    const cacheKey = `${chain.chainId}-${request.method}-${paramsKeySuffix}`;

    // TODO: consider passing the request as a whole, instead of just the params.
    const ttl = cacheConfig.ttl({
      chain,
      rawResponse: response,
      result: methodDescriptor.resultFromResponse(response),
      error: methodDescriptor.errorFromResponse(response),
      params: parsedParams.data,
      highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
      methodDescriptor,
    });

    const parsedResultResponse =
      methodDescriptor.resultResponseSchema.safeParse(response);

    if (!parsedResultResponse.success) {
      // TODO: handle error responses here too
      this.logger.warn(
        [
          "Cache: Incoming value was not a result response but cache config rules allowed writing.",
          `Method: ${request.method}`,
          `Cache Key: ${cacheKey}`,
          "Value Received:",
          JSON.stringify(response, null, 2),
          "Error:",
          `${parsedResultResponse.error.message}`,
        ].join("\n")
      );
    }

    await this.cache.set({
      key: cacheKey,
      ttl,
      value: response,
    });

    this.logger.info(
      `Cache: Cached result for key ${cacheKey}: ${JSON.stringify(
        response,
        null,
        2
      )}`
    );
  }

  public async get(
    chain: Chain,
    methodDescriptor: UnknownMethodDescriptor,
    request: JsonRPCRequest
  ): Promise<JsonRPCResponse | undefined> {
    if (!this.config.caching.enabled) {
      this.logger.info(
        `Cache: Caching is globally disabled. Not reading from cache.`
      );

      return;
    }
    // TODO: instead of returning | undefined, we should return a typed union
    // object that explains why the cache was not used, e.g.: { reason: "no-cache" }

    const { cacheConfig } = methodDescriptor;

    if (!cacheConfig?.readEnabled) {
      this.logger.info(
        `Cache: Cache read is disabled for method ${request.method}`
      );

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
      params: parsedParams.data,
      highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
      methodDescriptor,
    });

    const cacheKey = `${chain.chainId}-${request.method}-${paramsKeySuffix}`;
    const cachedResponse = await this.cache.get(cacheKey);

    if (!cachedResponse) {
      this.logger.info(`Cache: No cached result for key ${cacheKey}`);

      return undefined;
    }

    const parsedValidJsonRpcResponse =
      JsonRPCResponseSchema.safeParse(cachedResponse);

    if (!parsedValidJsonRpcResponse.success) {
      this.logger.error(
        [
          "Cache: Cached value was not a valid JSON-RPC response. This should never happen. Cached response won't be returned.",
          `Method: ${request.method}`,
          `Cache Key: ${cacheKey}`,
          "Value Received:",
          JSON.stringify(cachedResponse, null, 2),
          "Error:",
          `${parsedValidJsonRpcResponse.error.message}`,
        ].join("\n")
      );

      return undefined;
    }

    const parsedResultResponse =
      methodDescriptor.resultResponseSchema.safeParse(cachedResponse);

    if (!parsedResultResponse.success) {
      this.logger.warn(
        [
          "Cache: Cached value was not a result response but this was previously allowed to be cached.",
          `Method: ${request.method}`,
          `Cache Key: ${cacheKey}`,
          "Value Received:",
          JSON.stringify(cachedResponse, null, 2),
          "Error:",
          `${parsedResultResponse.error.message}`,
        ].join("\n")
      );
    }

    this.logger.info(
      `Cache: Returning cached response for key ${cacheKey}: ${JSON.stringify(
        cachedResponse,
        null,
        2
      )}`
    );

    return {
      ...parsedValidJsonRpcResponse.data,
      // TODO: is setting the id the responsibility of the cache?
      // should it be done outside instead?
      id: request.id,
    };
  }
}
