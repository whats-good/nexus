import { NexusConfig, NexusConfigOptions } from "@src/config";
import { IntString, NexusNotFoundResponse, Route } from "@src/controller";
import { RpcRequestHandler } from "@src/rpc";
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
  "/chains/:chainId",
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
      const rpcRequestHandler = RpcRequestHandler.fromConfig(config);
      const rpcResponse = await rpcRequestHandler.handle(
        request,
        chainIdParams
      );
      return rpcResponse.buildResponse();
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
