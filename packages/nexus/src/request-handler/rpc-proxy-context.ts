import type { Config } from "../config";
import type { RpcEndpointPool } from "../rpc-endpoint/rpc-endpoint-pool";
import type { Chain, ChainStatus } from "../chain/chain";
import type { JsonRPCRequest } from "../rpc-endpoint/json-rpc-types";

type Access = "unprotected" | "unauthorized" | "authorized";

interface BaseStatus {
  success: boolean;
  message: string;
  code: number;
  path: string;
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

  public readonly jsonRPCRequest?: JsonRPCRequest;
  public relayResult?: Awaited<ReturnType<RpcEndpointPool["relay"]>>;
  private readonly config: Config;
  public readonly path: string;

  private readonly clientAccessKey?: string;

  constructor(params: {
    pool?: RpcEndpointPool;
    chain?: Chain;
    config: Config;
    jsonRPCRequest?: JsonRPCRequest;
    path: string;
    clientAccessKey?: string;
  }) {
    this.chain = params.chain;
    this.config = params.config;
    this.jsonRPCRequest = params.jsonRPCRequest;
    this.pool = params.pool;
    this.path = params.path;
    this.clientAccessKey = params.clientAccessKey;
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
      path: this.path,
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
    if (!this.config.globalAccessKey) {
      return "unprotected";
    } else if (this.clientAccessKey === this.config.globalAccessKey) {
      return "authorized";
    }

    return "unauthorized";
  }

  public async relay() {
    if (!this.jsonRPCRequest) {
      // TODO: test
      // TODO: pass the actual parse result into the context, not the
      // jsonRPCRequest
      return {
        status: 400,
        body: {
          message: "Invalid Json RPC Request",
        },
      };
    }

    if (!this.pool) {
      // TODO: cover the cases where there are no known providers configured
      // to support the given chain
      return {
        status: 500,
        body: {
          message: "Unexpected Error: Pool unitialized",
        },
      };
    }

    this.relayResult = await this.pool.relay(this.jsonRPCRequest);

    if (this.relayResult.type === "success") {
      return {
        status: 200, // TODO: should this be 200? or should it be adjusted based on the response?
        body: this.relayResult.data,
      };
    }

    // TODO: should respond with a jsonrpc-compliant error

    const status = await this.getStatus();

    // TODO: status should always fail here, given the response is not ok.
    return {
      status: status.code,
      body: {
        message: status.message,
      },
    };
  }

  public async getStatus(): Promise<Status> {
    // TODO: cover malformed urls as well

    if (this.relayResult?.type === "all-failed") {
      // TODO: communicate the provider failures to the client
      console.error(
        "All providers failed to relay the request",
        this.relayResult.errors
      );

      return this.buildStatus({
        message: "All providers failed.",
        success: false,
        code: 500,
      });
    }

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
