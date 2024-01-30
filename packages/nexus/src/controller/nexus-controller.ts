import { PathParamsOf, Route } from "./route";
import { NexusResponse } from "./nexus-response";

export abstract class NexusController<R extends Route<string, unknown>> {
  protected abstract readonly route: R;

  public abstract handle(
    request: Request,
    pathParams: PathParamsOf<R>
  ): Promise<NexusResponse>;
}
