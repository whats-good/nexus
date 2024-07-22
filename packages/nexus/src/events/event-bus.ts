import type { Logger } from "pino";
import type { NexusRpcContext } from "@src/dependency-injection";
import type { NexusEvent } from "./nexus-event";

// TODO: settle on a naming convention: NexusEventBus vs EventBus etc

export class EventBus<TPlatformContext = unknown> {
  private readonly ctx: NexusRpcContext<TPlatformContext>;
  private readonly eventQueue: NexusEvent[] = [];
  private readonly logger: Logger;
  // TODO: perhaps, ctx based loggers should have a reference to the request Id, or some other unique identifier
  // TODO: in fact, the logger should be spawned from the ctx, not ctx.parent.
  // TODO: but also make sure that static container logs can be tied back to the request too. maybe this is a reason not to spawn loggers from the ctx.

  constructor(params: { ctx: NexusRpcContext<TPlatformContext> }) {
    this.ctx = params.ctx;
    this.logger = this.ctx.container.logger.child({
      name: this.constructor.name,
    });
  }

  // TODO: give ways to enqueue ordered and unordered events
  public dispatch(event: NexusEvent) {
    this.eventQueue.push(event);
  }
}
