import { z } from "zod";
import { match } from "path-to-regexp";

export class Route<P extends string, S> {
  constructor(
    public readonly pattern: P,
    public readonly schema: z.ZodType<S, any, any>
  ) {}

  public match(path: string): S | null {
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

    return null;
  }
}
