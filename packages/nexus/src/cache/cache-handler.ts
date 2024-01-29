import { BigNumber } from "@ethersproject/bignumber";
import type { NexusContext } from "@src/rpc/nexus-context";
import type { RpcRequestWithValidPayload } from "@src/rpc/rpc-request";
import {
  ErrorFieldSchema,
  type ErrorField,
  ErrorResponsePayloadSchema,
  BaseResponsePayload,
} from "@src/rpc/schemas";
import type { BaseCache } from "./base-cache";
import { RpcSuccessResponse } from "@src/rpc/rpc-response";

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

type CacheHandlerWriteResult =
  | {
      kind: "success";
    }
  | {
      kind: "unexpected-error";
      error: unknown;
    }
  | {
      kind: "denied";
    }
  | {
      kind: "not-configured";
    }
  | {
      kind: "invalid-result";
      result: unknown;
    };

// TODO: the cache handler is doing to much allow/deny work by parsing the input.
// especially the read part.
// all of that should be handled by the cache config, whichever way the user sets it up.
// this implies that errors, as well as success results, could be cached.
// which means that we should come up with our own storage format.
// something like:
/**
 * {
 *  kind: "success",
 *  result: ...
 * }
 *
 * {
 * kind: "error",
 * error: ...
 * }
 */
// rather than storing the entire response object, or just the error and result fields,
// we should store this new kind of storage object.

export class CacheHandler {
  constructor(public readonly cache: BaseCache) {}

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
        params: request.payload.params,
        highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
        methodDescriptor: request.methodDescriptor,
      });

      if (readConfig.kind === "deny") {
        return { kind: "denied" };
      }

      const baseCacheResponse = await this.cache.get(readConfig.key);

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

  public async handleWrite(
    context: NexusContext,
    result: unknown
  ): Promise<CacheHandlerWriteResult> {
    try {
      const { request } = context;
      const { methodDescriptor } = request;
      const { cacheConfig } = methodDescriptor;

      if (!cacheConfig) {
        return {
          kind: "not-configured",
        };
      }

      // TODO: we should only pass chain, highestKnownBlockNumber and methodDescriptor to the write config. same for the read config. the rest can be handled internally
      const writeConfig = cacheConfig.getWriteConfig({
        chain: context.chain,
        params: request.payload.params,
        highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
        methodDescriptor: request.methodDescriptor,
        result,
      });

      if (writeConfig.kind === "deny") {
        return {
          kind: "denied",
        };
      }

      await this.cache.set({
        key: writeConfig.key,
        value: result,
        ttl: writeConfig.ttl,
      });

      return {
        kind: "success",
      };
    } catch (e) {
      return {
        kind: "unexpected-error",
        error: e,
      };
    }
  }
}
