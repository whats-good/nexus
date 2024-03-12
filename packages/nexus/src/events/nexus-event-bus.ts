import type { Constructor } from "@src/utils";
import type { Logger } from "@src/logger";
import type { Container } from "@src/dependency-injection";
import type { NexusEvent } from "./nexus-event";
import type { NexusEventHandler } from "./nexus-event-handler";

export interface EventAndHandlerPair<E extends NexusEvent, TServerContext> {
  event: Constructor<E>;
  handler: NexusEventHandler<E, TServerContext>;
}

export interface Emit {
  emit: (event: NexusEvent) => void;
}

export interface RunEvents<TServerContext = unknown> {
  runEvents: (container: Container<TServerContext>) => Promise<void>;
}

export class NexusEventBus<TServerContext = unknown>
  implements Emit, RunEvents<TServerContext>
{
  private pendingEvents: NexusEvent[] = [];
  private readonly handlers = new Map<
    Constructor<NexusEvent>,
    Set<NexusEventHandler<any, TServerContext>>
  >();

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
    container: Container<TServerContext>
  ): Promise<void>[] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- this function needs the any type
    const handlersSet = this.handlers.get(event.constructor as any);
    const handlersList = handlersSet ? Array.from(handlersSet) : [];

    if (handlersList.length === 0) {
      this.logger.debug(`No handlers for event: ${event.constructor.name}`);
    }

    return handlersList.map((handler) => handler(event, container));

    // TODO: add error handling
  }

  private getPromisesForEvents(
    events: NexusEvent[],
    container: Container<TServerContext>
  ): Promise<void>[] {
    let promises: Promise<void>[] = [];

    events.forEach((event) => {
      const currentEventPromises: Promise<void>[] = this.getPromisesForEvent(
        event,
        container
      );

      promises = promises.concat(currentEventPromises);
    });

    // TODO: add error handling
    return promises;
  }

  public async runEvents(container: Container<TServerContext>): Promise<void> {
    let i = 0;

    while (this.pendingEvents.length > 0) {
      this.logger.debug(`Running events iteration: ${i++}`);
      const pendingEvents = this.pendingEvents;

      this.pendingEvents = [];
      const promises = this.getPromisesForEvents(pendingEvents, container);

      await Promise.all(promises);
    }
  }
}
