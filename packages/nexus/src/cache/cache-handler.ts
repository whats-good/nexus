import { BigNumber } from "@ethersproject/bignumber";
import type { AllowReadConfigResult } from "@src/rpc-method-desciptor/cache-config";
import type { NexusContext } from "@src/rpc/nexus-context";
import type { RpcRequestWithValidPayload } from "@src/rpc/rpc-request";
import { ErrorFieldSchema, type ErrorField } from "@src/rpc/schemas";
import type { BaseCache } from "./base-cache";

type CacheHandlerReadResult =
  | {
      kind: "success-result";
      result: unknown;
    }
  | {
      kind: "legal-error-result";
      error: ErrorField;
    }
  | {
      kind: "not-found";
    }
  | {
      kind: "invalid-result";
      result: unknown;
    }
  | {
      kind: "denied";
    }
  | {
      kind: "not-configured";
    }
  | {
      kind: "unexpected-error";
      error: unknown;
    };

export class CacheHandler {
  constructor(public readonly cache: BaseCache) {}

  private getCacheKey(
    context: NexusContext,
    request: RpcRequestWithValidPayload,
    readConfig: AllowReadConfigResult
  ) {
    const { chain } = context;
    const { paramsKeySuffix } = readConfig;

    const cacheKey = `${chain.chainId}-${request.parsedPayload.method}-${paramsKeySuffix}`;

    return cacheKey;
  }

  public async handleRead(
    context: NexusContext,
    request: RpcRequestWithValidPayload
  ): Promise<CacheHandlerReadResult> {
    try {
      const { methodDescriptor } = request;
      const { cacheConfig } = methodDescriptor;

      if (!cacheConfig) {
        return { kind: "not-configured" };
      }

      const readConfig = cacheConfig.getReadConfig({
        chain: context.chain,
        params: request.parsedPayload.params,
        highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
        methodDescriptor: request.methodDescriptor,
      });

      if (readConfig.kind === "deny") {
        return { kind: "denied" };
      }

      const cacheKey = this.getCacheKey(context, request, readConfig);

      const baseCacheResponse = await this.cache.get(cacheKey);

      if (baseCacheResponse.kind === "not-found") {
        return { kind: "not-found" };
      } else if (baseCacheResponse.kind === "failure") {
        return { kind: "unexpected-error", error: baseCacheResponse.error };
      }

      const { value } = baseCacheResponse;

      const successResultParsed =
        methodDescriptor.resultSchema.safeParse(value);

      if (successResultParsed.success) {
        return { kind: "success-result", result: successResultParsed.data };
      }

      const errorResultParsed = ErrorFieldSchema.safeParse(value);

      if (errorResultParsed.success) {
        return { kind: "legal-error-result", error: errorResultParsed.data };
      }

      return { kind: "invalid-result", result: value };
    } catch (e) {
      return { kind: "unexpected-error", error: e };
    }
  }
}
