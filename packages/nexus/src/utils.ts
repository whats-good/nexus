export const shuffle = <T>(arr: T[]): T[] => {
  const newArr = [...arr];

  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }

  return newArr;
};

export const toSnakeCase = (str: string): string => {
  // ignore all letters that are preceeded by any number of underscores
  return str.replace(/(?<!_)[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export const toUpperSnakeCase = (str: string): string => {
  return toSnakeCase(str).toUpperCase();
};
