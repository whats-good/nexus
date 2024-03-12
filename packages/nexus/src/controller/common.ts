import { z } from "zod";

export const IntString = z
  .number({
    coerce: true,
  })
  .int();
