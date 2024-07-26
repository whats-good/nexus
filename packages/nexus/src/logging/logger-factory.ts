import type { Logger } from "pino";
import { inject, injectable } from "inversify";
import { NexusConfig } from "@src/nexus-config";

@injectable()
export class LoggerFactory {
  constructor(@inject(NexusConfig) private readonly config: NexusConfig) {}

  public get(name: string, options: Record<string, any> = {}): Logger {
    // TODO: redact node provider url, and start logging providers directly
    // TODO: find out what the x in 'name/x`is as they appear in the logs
    return this.config.logger.child({ name, ...options });
  }
}
