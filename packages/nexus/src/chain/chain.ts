export class Chain {
  public readonly name: string;
  public readonly chainId: number;
  public readonly blockTime: number;

  constructor({
    name,
    chainId,
    blockTime,
  }: {
    name: string;
    chainId: number;
    blockTime: number;
  }) {
    this.name = name;
    this.chainId = chainId;
    this.blockTime = blockTime;
  }
}
