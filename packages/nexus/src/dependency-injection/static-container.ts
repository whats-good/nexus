import type { Logger } from "pino";
import { injectable } from "tsyringe";
import { AuthorizationService } from "@src/auth";
import { NexusConfig } from "@src/nexus-config";
import { EventBus } from "@src/events";

// TODO: remove this entire class
@injectable()
export class StaticContainer {
  public readonly authorizationService: AuthorizationService;
  public readonly eventBus = new EventBus();

  constructor(public readonly config: NexusConfig) {
    this.authorizationService = new AuthorizationService(this.config.authKey);
  }

  public getLogger(name: string, options: Record<string, any> = {}): Logger {
    // TODO: redact node provider url, and start logging providers directly
    // TODO: find out what the x in 'name/x`is as they appear in the logs
    return this.config.logger.child({ name, ...options });
  }
}
