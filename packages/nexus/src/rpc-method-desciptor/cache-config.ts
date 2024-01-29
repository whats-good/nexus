import type { BigNumber } from "@ethersproject/bignumber";
import type { Chain } from "@src/chain";
import type { ErrorResponsePayloadSchema } from "@src/rpc/schemas";
import type { RpcMethodDescriptor } from "./rpc-method-descriptor";

interface CacheConfigOptionReadFnArgs<M extends string, P, R> {
  chain: Chain;
  params: P;
  highestKnownBlockNumber: BigNumber;
  methodDescriptor: RpcMethodDescriptor<M, P, R>;
}
type CacheConfigOptionReadFn<T, M extends string, P, R> = (
  params: CacheConfigOptionReadFnArgs<M, P, R>
) => T;
type CacheConfigOptionReadField<T, M extends string, P, R> =
  | T
  | CacheConfigOptionReadFn<T, M, P, R>;

interface CacheConfigOptionWriteFnArgs<M extends string, P, R>
  extends CacheConfigOptionReadFnArgs<M, P, R> {
  result: R;
}
type CacheConfigOptionWriteFn<T, M extends string, P, R> = (
  params: CacheConfigOptionWriteFnArgs<M, P, R>
) => T;
type CacheConfigOptionWriteField<T, M extends string, P, R> =
  | T
  | CacheConfigOptionWriteFn<T, M, P, R>;

export interface AllowReadConfigResult {
  kind: "allow";
  key: string;
}

interface DenyReadConfigResult {
  kind: "deny";
}
type FinalizedReadTimeConfigResult =
  | AllowReadConfigResult
  | DenyReadConfigResult;

type FinalizedWriteTimeConfigResult =
  | {
      kind: "allow";
      ttl: number;
      key: string;
    }
  | {
      kind: "deny";
    };

export interface CacheConfigOptions<M extends string, P, R> {
  paramsKeySuffix: CacheConfigOptionReadField<string, M, P, R>;
  ttl: CacheConfigOptionWriteField<number, M, P, R>;
  disableRead?: CacheConfigOptionReadField<boolean, M, P, R>;
  disableWrite?: CacheConfigOptionWriteField<boolean, M, P, R>;
}

export class CacheConfig<M extends string, P, R> {
  constructor(private readonly options: CacheConfigOptions<M, P, R>) {}

  private getDisableRead(args: CacheConfigOptionReadFnArgs<M, P, R>) {
    if (typeof this.options.disableRead === "function") {
      return this.options.disableRead(args);
    }

    return this.options.disableRead === true;
  }

  private getDisableWrite(args: CacheConfigOptionWriteFnArgs<M, P, R>) {
    if (typeof this.options.disableWrite === "function") {
      return this.options.disableWrite(args);
    }

    return this.options.disableWrite === true;
  }

  private getTtl(args: CacheConfigOptionWriteFnArgs<M, P, R>) {
    if (typeof this.options.ttl === "function") {
      return this.options.ttl(args);
    }

    return this.options.ttl;
  }

  private getParamsKeySuffix(args: CacheConfigOptionReadFnArgs<M, P, R>) {
    if (typeof this.options.paramsKeySuffix === "function") {
      return this.options.paramsKeySuffix(args);
    }

    return this.options.paramsKeySuffix;
  }

  public getCacheKey(args: CacheConfigOptionReadFnArgs<M, P, R>) {
    const { chain } = args;
    const paramsKeySuffix = this.getParamsKeySuffix(args);

    const cacheKey = `${chain.chainId}-${args.methodDescriptor.method}-${paramsKeySuffix}`;

    return cacheKey;
  }

  public getReadConfig(
    args: CacheConfigOptionReadFnArgs<M, P, R>
  ): FinalizedReadTimeConfigResult {
    if (this.getDisableRead(args)) {
      return {
        kind: "deny",
      };
    }

    return {
      kind: "allow",
      key: this.getCacheKey(args),
    };
  }

  public getWriteConfig(
    args: CacheConfigOptionWriteFnArgs<M, P, R>
  ): FinalizedWriteTimeConfigResult {
    if (this.getDisableWrite(args)) {
      return {
        kind: "deny",
      };
    }

    return {
      kind: "allow",
      ttl: this.getTtl(args),
      key: this.getParamsKeySuffix(args),
    };
  }
}
