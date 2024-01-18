import type { Chain } from "../chain";
import type { ServiceProvider } from "./service-provider";

export class ServiceProviderEndpoint {
  constructor(
    public readonly serviceProvider: ServiceProvider,
    public readonly chain: Chain,
    public readonly url: string
  ) {}
}
