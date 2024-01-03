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

    let paramsKeySuffix = "";

    if (typeof cacheConfig.paramsKeySuffix === "string") {
      paramsKeySuffix = cacheConfig.paramsKeySuffix;
    } else if (typeof cacheConfig.paramsKeySuffix === "function") {
      paramsKeySuffix = cacheConfig.paramsKeySuffix({
        chain,
        params: parsedParams.data as unknown,
        highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
      });
    }

    const cacheKey = `${chain.chainId}-${request.method}-${paramsKeySuffix}`;

    const parsedResult = methodDescriptor.successValueSchema.safeParse(
      response.result
    );

    if (!parsedResult.success) {
      this.logger.info(
        `Cache: Invalid result for method ${request.method}: ${
          parsedResult.error.message
        }. ${JSON.stringify(response.result, null, 2)}`
      );

      return undefined;
    }

    let ttl = 0;

    if (typeof cacheConfig.ttl === "number") {
      ttl = cacheConfig.ttl;
    } else if (typeof cacheConfig.ttl === "function") {
      ttl = cacheConfig.ttl({
        chain,
        params: parsedParams.data as unknown,
        highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
      });
    }

    await this.cache.set({
      key: cacheKey,
      ttl,
      value: parsedResult.data as unknown,
    });

    this.logger.info(
      `Cache: Cached result for key ${cacheKey}: ${JSON.stringify(
        parsedResult.data,
        null,
        2
      )}`
    );
  }

  public async get(
    chain: Chain,
    request: JsonRPCRequest
  ): Promise<JsonRPCResponse | undefined> {
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

    let paramsKeySuffix = "";

    if (typeof cacheConfig.paramsKeySuffix === "string") {
      paramsKeySuffix = cacheConfig.paramsKeySuffix;
    } else if (typeof cacheConfig.paramsKeySuffix === "function") {
      paramsKeySuffix = cacheConfig.paramsKeySuffix({
        chain,
        params: parsedParams.data as unknown,
        highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
      });
    }

    const cacheKey = `${chain.chainId}-${request.method}-${paramsKeySuffix}`;
    const cachedResult = await this.cache.get(cacheKey);

    if (!cachedResult) {
      this.logger.info(`Cache: No cached result for key ${cacheKey}`);

      return undefined;
    }

    const parsedResult =
      methodDescriptor.successValueSchema.safeParse(cachedResult);

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
