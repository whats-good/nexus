export class Chain {
  public readonly name: string;
  public readonly chainId: number;
  public blockTime: number;

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

  public setBlockTime(blockTime: number) {
    this.blockTime = blockTime;
  }
}
