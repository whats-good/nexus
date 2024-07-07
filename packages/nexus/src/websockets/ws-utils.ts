import WebSocket from "ws";

const DEFAULT_TIMEOUT_MS = 5000;

export function tryConnect(
  url: string | URL,
  options?: { timeout: number }
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    const timeoutId = setTimeout(
      () => {
        ws.terminate();
        reject(new Error("Connection timed out"));
      },
      options?.timeout || DEFAULT_TIMEOUT_MS
    );

    ws.on("open", () => {
      clearTimeout(timeoutId);
      ws.removeAllListeners("open");
      ws.removeAllListeners("error");
      resolve(ws);
    });

    ws.on("error", (err) => {
      clearTimeout(timeoutId);
      ws.terminate();
      reject(err);
    });
  });
}
