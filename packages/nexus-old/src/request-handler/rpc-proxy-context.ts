import type { Config, Logger } from "@src/config";
import type { UnknownMethodDescriptor } from "@src/method-descriptor";
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
  public readonly request: Request;
  public readonly jsonRPCRequest?: JsonRPCRequest;
  public readonly methodDescriptor?: UnknownMethodDescriptor;
  public relayResult?: Awaited<ReturnType<RpcEndpointPool["relay"]>>;
  public readonly path: string;

  private readonly config: Config;
  private readonly clientAccessKey?: string;
  private readonly logger: Logger;

  constructor(params: {
    pool?: RpcEndpointPool;
    chain?: Chain;
    config: Config;
    request: Request;
    jsonRPCRequest?: JsonRPCRequest;
    methodDescriptor?: UnknownMethodDescriptor;
  }) {
    this.chain = params.chain;
    this.config = params.config;
    this.jsonRPCRequest = params.jsonRPCRequest;
    this.pool = params.pool;
    this.request = params.request;

    const requestUrl = new URL(params.request.url);

    this.path = requestUrl.pathname;
    this.clientAccessKey = requestUrl.searchParams.get("key") || undefined;

    this.logger = this.config.logger;
    this.methodDescriptor = params.methodDescriptor;
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
        chain: this.chain.getStatus(this.config),
      };
    }

    // TODO: we should always fire the request to the provider to check if it's up.

    return {
      ...baseStatus,
      success: false,
      access,
      chain: this.chain?.getStatus(this.config) ?? null,
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
    // TODO: make all these error states return jsonrpc compliant results
    if (!this.jsonRPCRequest) {
      // TODO: test
      return {
        status: 400,
        body: {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Parse error",
          },
        },
      };
    }

    if (!this.chain) {
      return {
        status: 400,
        body: {
          message:
            "Chain not found. Make sure you have the correct chain id, or the networkName + chainName defined in the url.",
        },
      };
    }

    if (!this.chain.getStatus(this.config).isEnabled) {
      return {
        status: 400,
        body: {
          message: `Chain not enabled: ${this.chain.chainId}`,
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

    const access = this.getAccess();

    if (!this.methodDescriptor) {
      // return a JSONRPC compliant error message,
      // saying the method is not supported
      // TODO: turn this into a proper JSONRPC error

      // TODO: reconstruct the request<->response architecture.
      // we have too much indirection here.

      // we need a proper Context object that holds the request, the response,
      // the methodDescriptor, the jsonRPCRequest, etc.

      // and it should have minimal business logic.

      return {
        status: 400,
        body: {
          id: this.jsonRPCRequest.id,
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not found",
          },
        },
      };
    }

    if (access === "authorized") {
      this.relayResult = await this.pool.relay(
        this.methodDescriptor,
        this.jsonRPCRequest
      );
    }

    if (this.relayResult?.type === "success") {
      // TODO: add a test for relay authorization issues, not just status
      return {
        status: 200, // TODO: should this be 200? or should it be adjusted based on the response?
        body: this.relayResult.result,
        cached: this.relayResult.cached,
      };
    }

    if (this.relayResult?.type === "method-not-allowed") {
      return {
        status: 405,
        body: {
          id: this.jsonRPCRequest.id,
          jsonrpc: "2.0",
          error: {
            code: -32004,
            message: "Method not supported",
          },
        },
      };
    }

    if (this.relayResult?.type === "invalid-params") {
      return {
        status: 400,
        body: {
          id: this.jsonRPCRequest.id,
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "Invalid params",
          },
        },
      };
    }

    const status = await this.getStatus();

    // TODO: relay should not return a status.
    // It should not return our internal status type.
    // in fact, we should get rid of this internal status type completely.

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
      this.logger.error("All providers failed to relay the request");
      this.logger.error(JSON.stringify(this.relayResult.errors, null, 2));

      return this.buildStatus({
        message: "All providers failed.",
        success: false,
        code: 500,
      });
    }

    // TODO: consolidate error messages between GET and POST

    if (this.chain?.getStatus(this.config).isEnabled === false) {
      return this.buildStatus({
        message: "Chain is disabled.",
        success: false,
        code: 400,
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

      this.logger.error(message);

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