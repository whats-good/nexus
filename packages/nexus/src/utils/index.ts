import { z } from "zod";

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

export const requiredUnknown = () => z.custom((x) => x !== undefined);
