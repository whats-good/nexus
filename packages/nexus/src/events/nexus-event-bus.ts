import { Constructor } from "@src/utils";
import { NexusEvent } from "./nexus-event";
import { NexusContext } from "@src/rpc";
import { NexusEventHandler } from "./nexus-event-handler";
import { Logger } from "@src/logger";

export type EventAndHandlerPair<E extends NexusEvent, TServerContext> = {
  event: Constructor<E>;
  handler: NexusEventHandler<E, TServerContext>;
};

export interface IEmit {
  emit(event: NexusEvent): void;
}

export interface IRunEvents<TServerContext = unknown> {
  runEvents(context: NexusContext<TServerContext>): Promise<void>;
}

export class NexusEventBus<TServerContext = unknown>
  implements IEmit, IRunEvents<TServerContext>
{
  private pendingEvents: NexusEvent[] = [];
  private readonly handlers: Map<
    Constructor<NexusEvent>,
    Set<NexusEventHandler<any, TServerContext>>
  > = new Map();

  private readonly logger: Logger;

  constructor(
    eventHandlers: EventAndHandlerPair<any, TServerContext>[],
    logger: Logger
  ) {
    eventHandlers.forEach((pair) => {
      this.registerHandler(pair.event, pair.handler);
    });
    this.logger = logger;
  }

  public emit(event: NexusEvent): void {
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

  private getPromisesForEvent(
    event: NexusEvent,
    context: NexusContext<TServerContext>
  ): Promise<void>[] {
    const handlersSet = this.handlers.get(event.constructor as any);
    const handlersList = handlersSet ? Array.from(handlersSet) : [];
    if (handlersList.length === 0) {
      this.logger.debug(`No handlers for event: ${event.constructor.name}`);
    }
    return handlersList.map((handler) => handler(event, context));

    // TODO: add error handling
  }

  private getPromisesForEvents(
    events: NexusEvent[],
    context: NexusContext<TServerContext>
  ): Promise<void>[] {
    let promises: Promise<void>[] = [];
    events.forEach((event) => {
      const currentEventPromises: Promise<void>[] = this.getPromisesForEvent(
        event,
        context
      );
      promises = promises.concat(currentEventPromises);
    });

    // TODO: add error handling
    return promises;
  }

  public async runEvents(context: NexusContext<TServerContext>): Promise<void> {
    let i = 0;
    while (this.pendingEvents.length > 0) {
      this.logger.debug(`Running events iteration: ${i++}`);
      const pendingEvents = this.pendingEvents;
      this.pendingEvents = [];
      const promises = this.getPromisesForEvents(pendingEvents, context);
      await Promise.all(promises);
    }
  }
}
