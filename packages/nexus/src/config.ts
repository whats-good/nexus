import { z } from "zod";
import type { ChainRegistry } from "./chain/chain-registry";
import type { ServiceProviderRegistry } from "./service-provider/service-provider-registry";
import {
  defaultChainRegistry,
  defaultServiceProviderRegistry,
} from "./setup/data";

const RpxRelayRecoveryModeSchema = z.enum(["none", "cycle"]);
// none -> don't try to recover and fail immediately
// cycle -> cycle through the list of configured providers until one succeeds

// TODO: add retry to the list of recovery modes
type RpcRelayRecoveryMode = z.infer<typeof RpxRelayRecoveryModeSchema>;
// TODO: specify what kind of errors should trigger a recovery attempt

interface ProviderConfig {
  key?: string;
  enabled?: boolean;
}

interface ProviderConfigWithName extends ProviderConfig {
  name: string;
}

type ProviderConfigParam = string | ProviderConfigWithName;

type Env = Partial<Record<string, string>>;

export type ConfigConstructorParams = ConstructorParameters<typeof Config>[0];

export class Config {
  // TODO: what if i want to use different keys for the same provider?
  // should i allow my users to specify a key per chain?
  // or should i force them to create a separate rpc-proxy if they want to do that?

  public providers: Partial<Record<string, ProviderConfig>> = {};

  // all client-side access to the rpc-proxy should include this key.
  public globalAccessKey?: string;

  // sometimes a single provider may go down, so we allow you to configure
  // recovery by trying the next provider in the list.
  public recoveryMode: RpcRelayRecoveryMode;

  public readonly chainRegistry: ChainRegistry;

  public readonly serviceProviderRegistry: ServiceProviderRegistry;

  public readonly env: Env;

  constructor(params: {
    env?: Env;
    providers?: ProviderConfigParam[];
    globalAccessKey?: string;
    recoveryMode?: RpcRelayRecoveryMode;
    chainRegistry?: ChainRegistry;
    serviceProviderRegistry?: ServiceProviderRegistry;
  }) {
    const envRaw: Env = params.env || process.env;

    // only allow keys that start with NEXUS_ to be used
    this.env = Object.fromEntries(
      Object.entries(envRaw).filter(([key]) => key.startsWith("NEXUS_"))
    );

    params.providers?.forEach((provider) => {
      if (typeof provider === "string") {
        this.providers[provider] = {
          enabled: true,
        };
      } else {
        this.providers[provider.name] = provider;
      }
    });

    this.globalAccessKey =
      params.globalAccessKey || this.env.NEXUS_GLOBAL_ACCESS_KEY;
    this.recoveryMode = params.recoveryMode ?? "cycle";

    this.chainRegistry = params.chainRegistry ?? defaultChainRegistry;
    this.serviceProviderRegistry =
      params.serviceProviderRegistry ?? defaultServiceProviderRegistry;
  }
}
