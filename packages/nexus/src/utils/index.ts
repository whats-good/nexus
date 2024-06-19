import { z } from "zod";

export const requiredUnknown = () => z.custom((x) => x !== undefined);

export const randomizeArray = <T>(arr: T[]): T[] => {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

export function safeJsonStringify(
  value: unknown,
  replacer: (number | string)[] | null = null,
  space: string | number = 2
): string {
  try {
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
