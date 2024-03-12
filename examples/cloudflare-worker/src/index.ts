import {
  Nexus,
  CHAIN,
  NODE_PROVIDER,
  queryParamKeyAuthMiddleware,
  EVENT,
  Container,
  DeferAsyncFn,
  NexusServerInstance,
} from "@whatsgood/nexus";

// Step 1: Set up environment variables and server context.
// - Try putting your Alchemy key and a query param auth key in your .dev.vars file.
// - You can use the Cloudflare Workers dashboard to set environment variables on production.

// if (!self["ALCHEMY_KEY"]) {
//   throw new Error("ALCHEMY_KEY not set in environment");
// }

// if (!self["QUERY_PARAM_AUTH_KEY"]) {
//   throw new Error("QUERY_PARAM_AUTH_KEY not set in environment");
// }

// Step 2: Create ServerContext for CloudflareWorker runtime-specific dependencies.
// - Cloudflare will inject a waitUntil function into nexus ServerContext.
// - We then use this function to construct a deferAsync function, which is used to schedule async work. We need this workaround in cloudflare workers, because we can't use process.nextTick in the same way we can in node.js.

type CloudflareServerContext<TServerContext> = TServerContext & {
  waitUntil: ExecutionContext["waitUntil"];
};

type ServerContext = CloudflareServerContext<{
  ALCHEMY_KEY: string;
  QUERY_PARAM_AUTH_KEY: string;
}>;

const getDeferAsync = ({
  context,
}: {
  context: ServerContext;
}): DeferAsyncFn => {
  const fn = (task: () => Promise<void>) => {
    context.waitUntil(task());
  };
  fn.bind(context);
  return fn;
};

// Step 3: Create an example event handler.
// - Feel free to remove this example or add your own event handlers.
const onUnauthorizedAccess = async (
  event: EVENT.UnauthorizedAccessEvent,
  container: Container
) => {
  console.log("starting the onUnauthorizedAccess function");
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      container.logger.info(`Unauthorized access at: ${event.createdAt}`);
      resolve();
    }, 2000);
  });
};

// Step 4: Create a Nexus instance by putting it all together
// - If run as is, this server will only support Ethereum mainnet, and will use Alchemy as the only node provider.
// - You can add more node providers and chains to the nodeProviders and chains arrays.
// - Pay attention to the middlewares and eventHandlers arrays.
// - Nexus ships with a query param auth middleware, which you can use to gate access to your server.
// - If you don't neet authorization, you can remove the queryParamKeyAuthMiddleware from the middlewares array.
// - You can also create your own middlewares and event handlers.

const nexus = Nexus.create<ServerContext>({
  nodeProviders: ({ context }) => [
    NODE_PROVIDER.alchemy.build(context.ALCHEMY_KEY),
  ],
  chains: [CHAIN.EthMainnet],
  middlewares: ({ context }) => [
    queryParamKeyAuthMiddleware(context.QUERY_PARAM_AUTH_KEY),
  ],
  eventHandlers: [
    {
      event: EVENT.UnauthorizedAccessEvent,
      handler: onUnauthorizedAccess,
    },
  ],
  deferAsync: getDeferAsync,
});

const cloudflareFetchOf =
  (nexus: NexusServerInstance<ServerContext>) =>
  (
    request: Request,
    env: Record<string, string>,
    executionContext: ExecutionContext
  ) => {
    return nexus.fetch(request, {
      ...env,
      waitUntil: executionContext.waitUntil.bind(executionContext),
    });
  };

// Step 5: Set the fetch handler

export default {
  fetch: cloudflareFetchOf(nexus),
};

// Step 6: Send a request to the server
// - Make sure you replace the query param key with the one you set in the .env file.

// curl http://localhost:4005/1\?key\=YOUR_SECRET_KEY \
//   -X POST \
//   -H "Content-Type: application/json" \
//   -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 5}'
