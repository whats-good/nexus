export abstract class NexusEvent {
  public readonly createdAt: Date = new Date();
  // TODO: add more fields, such as "emittedAt", "scheduledAt", "failedAt" etc
  constructor() {}
}
