import { z } from "zod";

export const IntSchema = z.number().int();
export const IntStringSchema = z.string().regex(/^[0-9]+$/);
export const NumberFromIntStringSchema = IntStringSchema.transform((str) =>
  parseInt(str, 10)
);

export const JSONStringSchema = z.string().transform((str, ctx): unknown => {
  try {
    return JSON.parse(str);
  } catch (e) {
    ctx.addIssue({ code: "custom", message: "Invalid JSON" });

    return z.NEVER;
  }
});

export function mapTuple<T extends readonly any[], U>(
  tuple: T,
  fn: (x: T[number]) => U
): { [K in keyof T]: U } {
  return tuple.map(fn) as any;
}
