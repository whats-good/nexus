import { Config } from "../config";
import type { ConfigConstructorParams } from "../config";
import { RequestHandler } from "../request-handler/request-handler";

export class Nexus {
  private readonly config: Config;

  public readonly requestHandler: RequestHandler;

  constructor(params: ConfigConstructorParams) {
    this.config = new Config(params);
    this.requestHandler = new RequestHandler({
      config: this.config,
      // TODO: make the chain registry part of the config
    });
  }
}
