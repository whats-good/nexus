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
