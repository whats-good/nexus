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
    try {
      const response = await nexus.handleNodeRequest(req, {
        req,
        reply,
      });
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });
      reply.status(response.status);
      const contentType = response.headers.get("content-type");
      if (contentType.includes("application/json")) {
        const data = await response.json();
        reply.send(data);
      } else if (contentType.includes("text/")) {
        const data = await response.text();
        reply.send(data);
      } else {
        const buffer = await response.arrayBuffer();
        reply.type(contentType).send(buffer);
      }
    } catch (e) {
      reply.send(e);
    }
  },
});

app.listen({
  port: 4005,
});
