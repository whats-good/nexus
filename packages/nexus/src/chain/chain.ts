export class Chain {
  public readonly name: string;
  public readonly chainId: number;
  public readonly blockTime: number; // in seconds

  constructor(params: { name: string; chainId: number; blockTime: number }) {
    this.name = params.name;
    this.chainId = params.chainId;
    this.blockTime = params.blockTime;
  }
}
