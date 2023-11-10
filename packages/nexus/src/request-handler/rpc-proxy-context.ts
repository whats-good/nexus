import type { Config } from "../config";
import type { RpcEndpointPool } from "../rpc-endpoint/rpc-endpoint-pool";
import type { Chain, ChainStatus } from "../chain/chain";

type Access = "unprotected" | "unauthorized" | "authorized";

interface BaseStatus {
  success: boolean;
  message: string;
  code: number;
  url: string;
}

interface SuccessStatus extends BaseStatus {
  success: true;
  access: "authorized";
  chain: ChainStatus;
}

interface ErrorStatus extends BaseStatus {
  success: false;
  access: Access;
  chain: ChainStatus | null;
}

type Status = SuccessStatus | ErrorStatus;

export class RpcProxyContext {
  public readonly chain?: Chain;
  public readonly pool?: RpcEndpointPool;

  public readonly request: Request;
  private readonly config: Config;

  constructor(params: {
    pool?: RpcEndpointPool;
    chain?: Chain;
    config: Config;
    request: Request;
  }) {
    this.chain = params.chain;
    this.config = params.config;
    this.request = params.request;
    this.pool = params.pool;
  }

  private buildStatus(params: {
    message: string;
    success: boolean;
    code: number;
  }): Status {
    // TODO: add isProduction
    // TODO: add isDeprecated
    // TODO: add isTestnet

    const baseStatus: BaseStatus = {
      success: params.success,
      message: params.message,
      code: params.code,
      url: this.request.url.toString(),
    };

    const access = this.getAccess();

    if (this.pool && this.chain && params.success && access === "authorized") {
      return {
        ...baseStatus,
        success: params.success,
        access,
        chain: this.chain.status,
      };
    }

    // TODO: we should always fire the request to the provider to check if it's up.

    return {
      ...baseStatus,
      success: false,
      access,
      chain: this.chain?.status ?? null,
    };
  }

  private getAccess(): Access {
    const requestUrl = new URL(this.request.url);
    const clientAccessKey = requestUrl.searchParams.get("key");

    if (!this.config.globalAccessKey) {
      return "unprotected";
    } else if (clientAccessKey === this.config.globalAccessKey) {
      return "authorized";
    }

    return "unauthorized";
  }

  public async getStatus(): Promise<Status> {
    // TODO: cover malformed urls as well

    if (!this.pool) {
      if (!this.chain) {
        return this.buildStatus({
          message:
            "Chain not found. Make sure you have the correct chain id, or the networkName + chainName defined in the url.",
          success: false,
          code: 400,
        });
      }

      const message = `Unexpected Error: Pool could not be built, even though the chain was found: ${this.chain.chainId}`;

      console.error(message);

      return this.buildStatus({
        message,
        success: false,
        code: 500,
      });
    }

    if (!this.pool.hasNext()) {
      return this.buildStatus({
        message:
          "Incomplete setup. Make sure you have at least one properly configured provider for this chain.",
        success: false,
        code: 404,
      });
    }

    const access = this.getAccess();

    if (access !== "authorized") {
      return this.buildStatus({
        message:
          access === "unprotected"
            ? "Endpoint is not protected. Please set config.globalAccessKey"
            : "Access denied.",
        success: false,
        code: 401,
      });
    }

    const isProviderUp = await this.pool.isUp();
    const success = isProviderUp;

    // TODO: expose not just the provider + chain support, but also the load balancing methodology.
    // i.e whether the provider was picked randomly.
    // TODO: should we fake CORS headers here?
    return this.buildStatus({
      message: success ? "Provider is up and running." : "Provider is down.",
      success,
      code: success ? 200 : 500,
    });
  }
}