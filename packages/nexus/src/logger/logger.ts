export interface Logger {
  debug: (message: string) => unknown;
  info: (message: string) => unknown;
  warn: (message: string) => unknown;
  error: (message: string) => unknown;
}
