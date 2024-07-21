const AUTH_KEY_QUERY_PARAM_NAME = "key";

export class AuthorizationService {
  constructor(private readonly authKey?: string) {}

  public isAuthorized(url: URL) {
    if (!this.authKey) {
      return true;
    }

    const clientAccessKey = url.searchParams.get(AUTH_KEY_QUERY_PARAM_NAME);

    return clientAccessKey === this.authKey;
  }
}
