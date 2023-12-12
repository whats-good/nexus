import { Nexus } from "@whatsgood/nexus";
import express from "express";
import type { Request as Req, Response as Res } from "express";
import { logger } from "./logger";

const app = express();

interface ExpressContext extends Record<string, any> {
  req: Req;
  res: Res;
}

const nexus = Nexus.create<ExpressContext>({
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
  logger,
});

app.use("/", nexus);

app.listen(4005, () => {
  logger.info("Running on port 4005");
});
