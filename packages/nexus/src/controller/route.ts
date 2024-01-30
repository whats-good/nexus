import { z } from "zod";
import { match } from "path-to-regexp";

export type PathParamsOf<T> = T extends Route<any, infer S> ? S : never;

export class Route<P extends string, S> {
  constructor(
    public readonly pattern: P,
    public readonly schema: z.ZodType<S, any, any>
  ) {}

  public safeMatch(path: string): S | null {
    try {
      return this.match(path);
    } catch {
      return null;
    }
  }

  public match(path: string): S {
    const matcher = match(this.pattern, { decode: decodeURIComponent });
    const routePayload = matcher(path);

    if (routePayload) {
      const parsedRoutePayloadParams = this.schema.safeParse(
        routePayload.params
      );

      if (parsedRoutePayloadParams.success) {
        return parsedRoutePayloadParams.data;
      }
    }

    throw new Error("Route match failed");
  }
}
