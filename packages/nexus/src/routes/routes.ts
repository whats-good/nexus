import { z } from "zod";
import { NumberFromIntStringSchema } from "@src/utils";
import { Route } from "./route";

export const chainIdRoute = new Route(
  "(.*)/:chainId",
  z.object({
    chainId: NumberFromIntStringSchema,
  })
);
