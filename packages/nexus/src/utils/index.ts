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

/**
 * Safely schedules an asynchronous function to be executed on the next tick of the Node.js event loop.
 * If the function throws an error, the provided `onError` callback will be invoked with the error.
 *
 * @param fn - An asynchronous function returning a Promise.
 * @param onError - A callback function that handles errors.
 */
export function safeAsyncNextTick(
  fn: () => Promise<void>,
  onError: (error: unknown) => void
) {
  process.nextTick(async () => {
    try {
      await fn();
    } catch (error) {
      onError(error);
    }
  });
}

export type AbstractClassConstructor<T, Args extends any[]> = new (
  ...args: Args
) => T;

export interface Constructor<T> {
  new (...args: any[]): T;
}
