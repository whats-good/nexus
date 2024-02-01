import { NexusResponse } from "./nexus-response";

export abstract class NexusController<P> {
  public abstract handle(
    request: Request,
    pathParams: P
  ): Promise<NexusResponse>;
}
