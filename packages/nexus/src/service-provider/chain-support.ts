import type { Chain } from "../chain";

export abstract class ChainSupport {
  constructor(public readonly chain: Chain) {}

  public abstract url: string;
}

export class UrlAppendedKeyChainSupport extends ChainSupport {
  public readonly url: string;
  public readonly baseURL: string;

  constructor(
    chain: Chain,
    baseURL: string,
    public readonly key: string
  ) {
    super(chain);
    // remove trailing slash
    this.baseURL = baseURL.replace(/\/$/, "");
    this.url = `${baseURL}/${key}`;
  }
}

export class UrlChainSupport extends ChainSupport {
  constructor(
    chain: Chain,
    public readonly url: string
  ) {
    super(chain);
  }
}
