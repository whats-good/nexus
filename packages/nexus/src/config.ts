import { z } from "zod";
import { globalSingletonRegistry } from "./registry/global-singleton-registry";
import type { Registry } from "./registry";

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
    providers: [ProviderConfigParam, ...ProviderConfigParam[]];
    chains: [ChainConfigParam, ...ChainConfigParam[]];
    globalAccessKey?: string;
    recoveryMode?: RpcRelayRecoveryMode;
    registry?: Registry;
  }) {
    params.providers.forEach((provider) => {
      if (typeof provider === "string") {
        this.providers[provider] = {
          enabled: true,
        };
      } else {
        this.providers[provider.name] = {
          enabled: provider.enabled ?? true,
          key: provider.key,
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

    this.globalAccessKey = params.globalAccessKey;
    this.recoveryMode = params.recoveryMode ?? "cycle";

    this.registry = params.registry || globalSingletonRegistry;
  }
}
