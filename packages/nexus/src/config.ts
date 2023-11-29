import { z } from "zod";
import { defaultRegistry } from "./registry/default-registry";
import type { Registry } from "./registry";
import { toUpperSnakeCase } from "./utils";

const RpxRelayRecoveryModeSchema = z.enum(["none", "cycle"]);
// none -> don't try to recover and fail immediately
// cycle -> cycle through the list of configured providers until one succeeds

// TODO: add retry to the list of recovery modes
type RpcRelayRecoveryMode = z.infer<typeof RpxRelayRecoveryModeSchema>;
// TODO: specify what kind of errors should trigger a recovery attempt

interface ProviderConfig {
  key?: string;
  enabled: boolean;
}

type ProviderConfigParam =
  | string
  | {
      name: string;
      key?: string;
      enabled?: boolean;
    };

interface ChainConfig {
  enabled: boolean;
}

type ChainConfigParam =
  | number
  | {
      chainId: number;
      enabled?: boolean;
    };

type Env = Partial<Record<string, string>>;

export type ConfigConstructorParams = ConstructorParameters<typeof Config>[0];

export class Config {
  // TODO: what if i want to use different keys for the same provider?
  // should i allow my users to specify a key per chain?
  // or should i force them to create a separate rpc-proxy if they want to do that?

  public providers: Partial<Record<string, ProviderConfig>> = {};

  public chains: Partial<Record<number, ChainConfig>> = {};

  // all client-side access to the rpc-proxy should include this key.
  public globalAccessKey?: string;

  // sometimes a single provider may go down, so we allow you to configure
  // recovery by trying the next provider in the list.
  public recoveryMode: RpcRelayRecoveryMode;

  public readonly registry: Registry;

  constructor(params: {
    env?: Env;
    providers: [ProviderConfigParam, ...ProviderConfigParam[]];
    chains: [ChainConfigParam, ...ChainConfigParam[]];
    globalAccessKey?: string;
    recoveryMode?: RpcRelayRecoveryMode;
    registry?: Registry;
  }) {
    const envRaw: Env = params.env || process.env;

    // only allow keys that start with NEXUS_ to be used
    // TODO: is this necessary now that we're not exporting the env object?
    const env = Object.fromEntries(
      Object.entries(envRaw).filter(([key]) => key.startsWith("NEXUS_"))
    );

    params.providers.forEach((provider) => {
      if (typeof provider === "string") {
        this.providers[provider] = {
          enabled: true,
        };
      } else {
        // TODO: scan all NEXUS_PROVIDER_*_KEY env vars and warn if there are any unused ones
        // or alternatively automatically enable the provider if there is a key for it
        this.providers[provider.name] = {
          enabled: provider.enabled ?? true,
          key: provider.key || env[this.getEnvSecretKeyName(provider.name)],
        };
      }
    });

    params.chains.forEach((chain) => {
      if (typeof chain === "number") {
        this.chains[chain] = {
          enabled: true,
        };
      } else {
        this.chains[chain.chainId] = {
          enabled: chain.enabled ?? true,
        };
      }
    });

    this.globalAccessKey =
      params.globalAccessKey || env.NEXUS_GLOBAL_ACCESS_KEY;
    this.recoveryMode = params.recoveryMode ?? "cycle";

    this.registry = params.registry || defaultRegistry;
  }

  private getEnvSecretKeyName(name: string): string {
    // TODO: update env vars and documentation to reflect this change
    return `NEXUS_PROVIDER_${toUpperSnakeCase(name)}_KEY`;
  }
}
