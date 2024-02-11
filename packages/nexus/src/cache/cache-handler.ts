import { BigNumber } from "@ethersproject/bignumber";
import type { NexusContext } from "@src/rpc";
import { ErrorFieldSchema, type ErrorField } from "@src/rpc/schemas";
import type { BaseCache } from "./base-cache";
import { NexusEvent } from "@src/events";
import { Logger } from "@src/logger";

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
      kind: "unexpected-error";
      error: unknown;
    };

export class CacheReadDeniedEvent extends NexusEvent {}

export class CacheReadMissEvent extends NexusEvent {
  constructor(
    public readonly kind: "not-found" | "unexpected-error" | "invalid"
  ) {
    super();
  }
}

export class CacheReadHitEvent extends NexusEvent {
  constructor(public readonly kind: "success" | "legal-error") {
    super();
  }
}

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
      kind: "invalid-result";
      result: unknown;
    };

export class CacheWriteSuccessEvent extends NexusEvent {}

export class CacheWriteDeniedEvent extends NexusEvent {}

export class CacheWriteFailureEvent extends NexusEvent {
  constructor(
    public readonly kind:
      | "unexpected-error"
      | "not-configured"
      | "invalid-result"
  ) {
    super();
  }
}

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

// export class CacheNotConfiguredEvent extends NexusEvent {}

// export class CacheReadDeniedEvent extends NexusEvent {}

export class CacheHandler<TServerContext> {
  constructor(
    private readonly cache: BaseCache,
    private readonly logger: Logger
  ) {}

  public async handleRead(
    context: NexusContext<TServerContext>
  ): Promise<CacheHandlerReadResult> {
    const result = await this._handleRead(context);

    switch (result.kind) {
      case "success-result": {
        this.logger.debug("cache read hit: success");
        context.eventBus.emit(new CacheReadHitEvent("success"));
        break;
      }
      case "legal-error-result": {
        this.logger.debug("cache read hit: legal error");
        context.eventBus.emit(new CacheReadHitEvent("legal-error"));
        break;
      }
      case "invalid-result": {
        // even though this was technically a hit, this result will be discarded
        // and this should be treated as a miss.
        this.logger.warn("cache read hit: invalid result");
        context.eventBus.emit(new CacheReadMissEvent("invalid"));
        break;
      }
      case "not-found": {
        this.logger.debug("cache read miss: not found");
        context.eventBus.emit(new CacheReadMissEvent("not-found"));
        break;
      }
      case "denied": {
        this.logger.debug("cache read denied.");
        context.eventBus.emit(new CacheReadDeniedEvent());
        break;
      }
      case "unexpected-error": {
        this.logger.error("cache read miss: unexpected error");
        context.eventBus.emit(new CacheReadMissEvent("unexpected-error"));
        break;
      }
    }

    return result;
  }

  private async _handleRead(
    context: NexusContext<TServerContext>
  ): Promise<CacheHandlerReadResult> {
    try {
      const { request } = context;
      const { methodDescriptor } = request;
      const { cacheConfig } = methodDescriptor;

      if (!cacheConfig) {
        return { kind: "denied" };
      }

      const readConfig = cacheConfig.getReadConfig({
        chain: context.chain,
        highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
        params: request.payload.params,
        method: request.payload.method,
      });

      if (readConfig.kind === "deny") {
        return { kind: "denied" };
      }

      const baseCacheResponse = await this.cache.get(readConfig.key);

      if (baseCacheResponse.kind === "miss") {
        return { kind: "not-found" };
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
    context: NexusContext<TServerContext>,
    result: unknown
  ) {
    const writeResult = await this._handleWrite(context, result);
    switch (writeResult.kind) {
      case "success": {
        context.eventBus.emit(new CacheWriteSuccessEvent());
        break;
      }
      case "denied": {
        context.eventBus.emit(new CacheWriteDeniedEvent());
        break;
      }
      case "invalid-result": {
        this.logger.error("failed to cache response due to invalid result.");
        context.eventBus.emit(new CacheWriteFailureEvent("invalid-result"));
        break;
      }
      case "unexpected-error": {
        this.logger.error("failed to cache response due to unexpected error.");
        context.eventBus.emit(new CacheWriteFailureEvent("unexpected-error"));
        break;
      }
    }

    return writeResult;
  }

  private async _handleWrite(
    context: NexusContext<TServerContext>,
    result: unknown
  ): Promise<CacheHandlerWriteResult> {
    try {
      const { request } = context;
      const { methodDescriptor } = request;
      const { cacheConfig } = methodDescriptor;

      if (!cacheConfig) {
        return {
          kind: "denied",
        };
      }

      // TODO: we should only pass chain, highestKnownBlockNumber and methodDescriptor to the write config. same for the read config. the rest can be handled internally
      const writeConfig = cacheConfig.getWriteConfig({
        chain: context.chain,
        params: request.payload.params,
        highestKnownBlockNumber: BigNumber.from(0), // TODO: actually cache and return this.
        method: request.payload.method,
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
