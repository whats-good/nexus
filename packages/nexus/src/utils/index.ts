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

type AsyncTask = () => Promise<void>;

export type DeferAsyncFn = (task: AsyncTask) => void;

/**
 * Schedules an asynchronous function to be executed on the next tick of the Node.js event loop.
 *
 */
export const defaultDeferAsync: DeferAsyncFn = (task: AsyncTask) => {
  process.nextTick(async () => {
    await task();
  });
};

export type AbstractClassConstructor<T, Args extends any[]> = new (
  ...args: Args
) => T;

export interface Constructor<T> {
  new (...args: any[]): T;
}
