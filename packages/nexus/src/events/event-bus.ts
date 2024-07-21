import type { Logger } from "pino";
import type { NexusRpcContext } from "@src/dependency-injection";
import { errSerialize } from "@src/utils";
import type { AnyEventHandlerOf } from "./event-handler";
import type { NexusEvent } from "./nexus-event";

// TODO: settle on a naming convention: NexusEventBus vs EventBus etc

export class EventBus<TPlatformContext = unknown> {
  private readonly handlers = new Map<
    // eslint-disable-next-line @typescript-eslint/ban-types -- We're using Function as a key, which is the most viable way to ensure a unique identifier without overburdening the user, forcing them to supply unique strings etc.
    Function,
    AnyEventHandlerOf<TPlatformContext>[]
  >();
  private readonly ctx: NexusRpcContext<TPlatformContext>;
  private readonly eventQueue: NexusEvent[] = [];
  private readonly logger: Logger;
  // TODO: perhaps, ctx based loggers should have a reference to the request Id, or some other unique identifier
  // TODO: in fact, the logger should be spawned from the ctx, not ctx.parent.
  // TODO: but also make sure that static container logs can be tied back to the request too. maybe this is a reason not to spawn loggers from the ctx.

  constructor(params: {
    handlers: AnyEventHandlerOf<TPlatformContext>[];
    ctx: NexusRpcContext<TPlatformContext>;
  }) {
    this.ctx = params.ctx;
    this.logger = this.ctx.container.logger.child({
      name: this.constructor.name,
    });

    for (const handler of params.handlers) {
      const currentHandlers = this.handlers.get(handler.event) || [];

      currentHandlers.push(handler);
      this.handlers.set(handler.event, currentHandlers);
    }
  }

  // TODO: give ways to enqueue ordered and unordered events
  public dispatch(event: NexusEvent) {
    this.eventQueue.push(event);
  }

  private async processEvent(event: NexusEvent) {
    const handlers = this.handlers.get(event.constructor);

    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler.handle(event, this.ctx);
        } catch (e) {
          this.logger.error(
            errSerialize(e),
            `Event handler failed for event: ${event.constructor.name}`
          );
        }
      }
    } else {
      this.logger.debug(
        `No handlers found for event: ${event.constructor.name}`
      );
    }
  }

  public async processAllEvents() {
    if (this.eventQueue.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${this.eventQueue.length} event(s)...`);

    for (const event of this.eventQueue) {
      await this.processEvent(event);
    }
  }
}
