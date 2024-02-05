import { NexusConfig, NexusConfigOptions } from "@src/config";
import { IntString, NexusNotFoundResponse, Route } from "@src/controller";
import { RpcRequestHandler } from "@src/rpc";
import { RpcContextFactory } from "@src/rpc/rpc-context-factory";
import {
  ServerAdapter,
  ServerAdapterBaseObject,
  createServerAdapter,
} from "@whatwg-node/server";
import { z } from "zod";

type NexusServerInstance<TServerContext> = ServerAdapter<
  TServerContext,
  Nexus<TServerContext>
>;

const chainIdRoute = new Route(
  "(.*)/:chainId",
  z.object({
    chainId: IntString,
  })
);

export class Nexus<TServerContext>
  implements ServerAdapterBaseObject<TServerContext>
{
  private constructor(
    private readonly options: NexusConfigOptions<TServerContext>
  ) {}

  public handle = async (
    request: Request,
    serverContext: TServerContext
  ): Promise<Response> => {
    const config = NexusConfig.fromOptions(this.options, {
      context: serverContext,
      request,
    });
    const chainIdParams = chainIdRoute.match(request.url);
    if (chainIdParams) {
      const rpcContextFactory = RpcContextFactory.fromConfig(config);
      const result = await rpcContextFactory.from(request, chainIdParams);
      if (result.kind === "success") {
        const rpcRequestHandler = RpcRequestHandler.fromConfig(config);
        const rpcResponse = await rpcRequestHandler.handle(result.context);
        return rpcResponse.buildResponse();
      } else {
        return result.response.buildResponse();
      }
    }

    return new NexusNotFoundResponse().buildResponse();
  };

  public static create<TServerContext>(
    options: NexusConfigOptions<TServerContext>
  ) {
    const server = new Nexus(options);

    return createServerAdapter<TServerContext, Nexus<TServerContext>>(
      server
    ) as unknown as NexusServerInstance<TServerContext>;
  }
}
