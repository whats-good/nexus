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
  value: any,
  replacer?: (number | string)[] | null,
  space?: string | number
): string {
  try {
    return JSON.stringify(value, replacer, space);
  } catch (error) {
    return `[Error: Could not stringify value]`;
  }
}
