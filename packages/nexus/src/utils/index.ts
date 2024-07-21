import { z } from "zod";

export const requiredUnknown = () => z.custom((x) => x !== undefined);

export function* weightedShuffleGenerator<T extends { weight: number }>(
  arr: T[]
): Generator<T, void> {
  // Copy the items to avoid mutating the original array
  const copy = [...arr];

  // Calculate the total weight
  let totalWeight = copy.reduce((sum, item) => sum + item.weight, 0);

  while (copy.length > 0) {
    // Generate a random number between 0 and the total weight
    let random = Math.random() * totalWeight;

    // Find the item that corresponds to the random number
    for (let i = 0; i < copy.length; i++) {
      random -= copy[i].weight;

      if (random <= 0) {
        // Add the selected item to the shuffled array
        yield copy[i];

        // Remove the selected item from the itemsCopy array
        totalWeight -= copy[i].weight;
        copy.splice(i, 1);
        break;
      }
    }
  }
}

export function* generatorOf<T>(arr: T[]): Generator<T, void> {
  for (const item of arr) {
    yield item;
  }
}

export function* take<T>(
  innerGenerator: Generator<T>,
  limit: number
): Generator<T, void> {
  let count = 0;

  for (const value of innerGenerator) {
    if (count >= limit) {
      return;
    }

    yield value;
    count++;
  }
}

function safeJsonStringify(
  value: unknown,
  replacer: (number | string)[] | null = null,
  space: string | number = 2
): string {
  try {
    // TODO: look into: https://github.com/fastify/fast-json-stringify
    return JSON.stringify(value, replacer, space);
  } catch (error) {
    return `[Error: Could not stringify value]`;
  }
}

export function safeErrorStringify(err: unknown) {
  if (!(err instanceof Error)) {
    return safeJsonStringify(err);
  }

  const plainObject: Record<string, any> = {};

  Object.getOwnPropertyNames(err).forEach((key) => {
    plainObject[key] = err[key as keyof Error];
  });

  return safeJsonStringify(plainObject);
}

export type Constructor<T> = new (...args: any[]) => T;

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

export const isNonEmptyArray = <T>(arr: T[]): arr is [T, ...T[]] =>
  arr.length > 0;
