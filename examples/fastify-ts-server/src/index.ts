import { Nexus } from "@whatsgood/nexus";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";

const app = Fastify({
  logger: true,
});

const nexus = Nexus.create<{
  req: FastifyRequest;
  reply: FastifyReply;
}>({
  providers: [
    {
      name: "alchemy",
      key: process.env.ALCHEMY_KEY,
    },
    {
      name: "infura",
      key: process.env.INFURA_KEY,
    },
    {
      name: "ankr",
      key: process.env.ANKR_KEY,
    },
  ],
  chains: [1],
  globalAccessKey: process.env.NEXUS_GLOBAL_ACCESS_KEY,
  environment: process.env.NODE_ENV,
});

app.route({
  url: "/*",
  method: ["GET", "POST", "OPTIONS"],

  handler: async (req, reply) => {
    const response = await nexus.handleNodeRequest(req, {
      req,
      reply,
    });
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });
    reply.status(response.status);
    reply.send(response.body);
    return reply;
  },
});

app.listen({
  port: 4005,
});
