import type { BigNumber } from "@ethersproject/bignumber";
import type { Chain } from "@src/chain";

interface CacheConfigOptionReadFnArgs<P> {
  chain: Chain;
  params: P;
  highestKnownBlockNumber: BigNumber;
  method: string;
}
type CacheConfigOptionReadFn<T, P, R> = (
  args: CacheConfigOptionReadFnArgs<P>
) => T;
type CacheConfigOptionReadField<T, P, R> = T | CacheConfigOptionReadFn<T, P, R>;

interface CacheConfigOptionWriteFnArgs<P, R>
  extends CacheConfigOptionReadFnArgs<P> {
  result: R;
}
type CacheConfigOptionWriteFn<T, P, R> = (
  params: CacheConfigOptionWriteFnArgs<P, R>
) => T;
type CacheConfigOptionWriteField<T, P, R> =
  | T
  | CacheConfigOptionWriteFn<T, P, R>;

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

export interface CacheConfigOptions<P, R> {
  paramsKeySuffix: CacheConfigOptionReadField<string, P, R>;
  ttl: CacheConfigOptionWriteField<number, P, R>;
  disableRead?: CacheConfigOptionReadField<boolean, P, R>;
  disableWrite?: CacheConfigOptionWriteField<boolean, P, R>;
}

export class CacheConfig<P, R> {
  constructor(private readonly options: CacheConfigOptions<P, R>) {}

  private getDisableRead(args: CacheConfigOptionReadFnArgs<P>) {
    if (typeof this.options.disableRead === "function") {
      return this.options.disableRead(args);
    }

    return this.options.disableRead === true;
  }

  private getDisableWrite(args: CacheConfigOptionWriteFnArgs<P, R>) {
    if (typeof this.options.disableWrite === "function") {
      return this.options.disableWrite(args);
    }

    return this.options.disableWrite === true;
  }

  private getTtl(args: CacheConfigOptionWriteFnArgs<P, R>) {
    if (typeof this.options.ttl === "function") {
      return this.options.ttl(args);
    }

    return this.options.ttl;
  }

  private getParamsKeySuffix(args: CacheConfigOptionReadFnArgs<P>) {
    if (typeof this.options.paramsKeySuffix === "function") {
      return this.options.paramsKeySuffix(args);
    }

    return this.options.paramsKeySuffix;
  }

  public getCacheKey(args: CacheConfigOptionReadFnArgs<P>) {
    const { chain } = args;
    const paramsKeySuffix = this.getParamsKeySuffix(args);

    const cacheKey = `${chain.chainId}-${args.method}-${paramsKeySuffix}`;

    return cacheKey;
  }

  public getReadConfig(
    args: CacheConfigOptionReadFnArgs<P>
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
    args: CacheConfigOptionWriteFnArgs<P, R>
  ): FinalizedWriteTimeConfigResult {
    if (this.getDisableWrite(args)) {
      return {
        kind: "deny",
      };
    }

    return {
      kind: "allow",
      ttl: this.getTtl(args),
      key: this.getCacheKey(args),
    };
  }
}
