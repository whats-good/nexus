import { Constructor } from "@src/utils";
import { NexusEvent } from "./nexus-event";
import { NexusContext } from "@src/rpc";
import { NexusEventHandler } from "./nexus-event-handler";

type EventAndHandlerPair<E extends NexusEvent, TServerContext> = {
  event: Constructor<E>;
  handler: NexusEventHandler<E, TServerContext>;
};

export class NexusEventBus<TServerContext = unknown> {
  private readonly pendingEvents: NexusEvent[] = [];
  private readonly handlers: Map<
    Constructor<NexusEvent>,
    Set<NexusEventHandler<any, TServerContext>>
  > = new Map();

  constructor(eventHandlers: EventAndHandlerPair<any, TServerContext>[]) {
    eventHandlers.forEach((pair) => {
      this.registerHandler(pair.event, pair.handler);
    });
  }

  public schedule(event: NexusEvent): void {
    this.pendingEvents.push(event);
  }

  private registerHandler<E extends NexusEvent>(
    event: Constructor<E>,
    handler: NexusEventHandler<E, TServerContext>
  ): void {
    const currentHandlers = this.handlers.get(event) || new Set();
    if (currentHandlers.has(handler)) {
      throw new Error("Handler already registered");
    }
    this.handlers.set(event, currentHandlers);
    currentHandlers.add(handler);
  }

  private async runHandlersForEvent(
    event: NexusEvent,
    context: NexusContext<TServerContext>
  ): Promise<void> {
    const handlersSet = this.handlers.get(event.constructor as any);
    const handlersList = handlersSet ? Array.from(handlersSet) : [];
    const promises = handlersList.map((handler) => handler(event, context));

    // TODO: add error handling
    await Promise.all(promises);
  }

  public async runEvents(context: NexusContext<TServerContext>): Promise<void> {
    const promises: Promise<void>[] = this.pendingEvents.map((event) => {
      return this.runHandlersForEvent(event, context);
    });

    // TODO: add error handling
    await Promise.all(promises);
  }
}
