import { Lifecycle, scoped } from "tsyringe";
import { NexusConfig } from "@src/nexus-config";

const AUTH_KEY_QUERY_PARAM_NAME = "key";

@scoped(Lifecycle.ContainerScoped)
export class AuthorizationService {
  private readonly authKey?: string;

  constructor(config: NexusConfig) {
    this.authKey = config.authKey;
  }

  public isAuthorized(url: URL) {
    if (!this.authKey) {
      return true;
    }

    const clientAccessKey = url.searchParams.get(AUTH_KEY_QUERY_PARAM_NAME);

    return clientAccessKey === this.authKey;
  }
}
