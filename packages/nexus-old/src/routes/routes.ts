import { match } from "path-to-regexp";
import { z } from "zod";

const r = <P extends string, S extends z.ZodRawShape>(pattern: P, shape: S) => {
  return {
    pattern,
    schema: z.object(shape),
  };
};

const IntString = z
  .number({
    coerce: true,
  })
  .int();

// TODO: write docs for this feature
const routes = [
  r("(.*)/:chainId", {
    chainId: IntString,
  }),
  r("(.*)/:networkName/:chainName", {
    networkName: z.string(),
    chainName: z.string(),
  }),
] as const;

type Route = (typeof routes)[number];
type ParamsOf<R extends Route> = z.infer<R["schema"]>;
interface ParsedRoute<R extends Route> {
  route: R;
  params: ParamsOf<R>;
}

export type AnyParsedRoute = ParsedRoute<Route>;

export const matchPath = (path: string): AnyParsedRoute | null => {
  // TODO: handle query params in path
  for (const route of routes) {
    const matcher = match(route.pattern, { decode: decodeURIComponent });
    const params = matcher(path);

    if (params) {
      const parsedParams = route.schema.safeParse(params.params);

      if (parsedParams.success) {
        return { route, params: parsedParams.data };
      }
    }
  }

  return null;
};
