import { z } from "zod";

const RpxRelayRecoveryModeSchema = z.enum(["none", "cycle"]);
// none -> don't try to recover and fail immediately
// cycle -> cycle through the list of configured providers until one succeeds

// TODO: add retry to the list of recovery modes
type RpcRelayRecoveryMode = z.infer<typeof RpxRelayRecoveryModeSchema>;
// TODO: specify what kind of errors should trigger a recovery attempt

interface ProviderConfig {
  key?: string;
}

type Env = Partial<Record<string, string>>;

interface ConfigConstructorParams extends Partial<Config> {
  // some runtimes don't support process.env (e.g. Cloudflare Workers)
  // so we allow them to pass in an object with the same keys as process.env
  env?: Env;
}

export class Config {
  // TODO: what if i want to use different keys for the same provider?
  // should i allow my users to specify a key per chain?
  // or should i force them to create a separate rpc-proxy if they want to do that?

  public providers: Partial<Record<string, ProviderConfig>>;

  // all client-side access to the rpc-proxy should include this key.
  public globalAccessKey?: string;

  // all admin access to the rpc-proxy should include this key.
  public adminAccessKey?: string;

  // sometimes a single provider may go down, so we allow you to configure
  // recovery by trying the next provider in the list.
  public recoveryMode: RpcRelayRecoveryMode;

  constructor(params: ConfigConstructorParams) {
    const env: Env = params.env || process.env;

    this.providers = {
      ankr: {
        key: params.providers?.ankr?.key || env.NEXUS_ANKR_KEY,
      },
      infura: {
        key: params.providers?.infura?.key || env.NEXUS_INFURA_KEY,
      },
      alchemy: {
        key: params.providers?.alchemy?.key || env.NEXUS_ALCHEMY_KEY,
      },
    };

    this.globalAccessKey =
      params.globalAccessKey || env.NEXUS_GLOBAL_ACCESS_KEY;
    this.adminAccessKey = params.adminAccessKey || env.NEXUS_ADMIN_ACCESS_KEY;
    this.recoveryMode = Config.recoveryModeFromConfig(params, env);
  }

  private static recoveryModeFromConfig(
    params: ConfigConstructorParams,
    env: Partial<Record<string, string>>
  ): RpcRelayRecoveryMode {
    if (params.recoveryMode) {
      return params.recoveryMode;
    }

    const parsedRecoveryMode = RpxRelayRecoveryModeSchema.safeParse(
      env.NEXUS_RECOVERY_MODE
    );

    if (parsedRecoveryMode.success) {
      return parsedRecoveryMode.data;
    }

    return "cycle";
  }
}
