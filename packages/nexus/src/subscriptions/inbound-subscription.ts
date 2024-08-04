import type { Logger } from "pino";
import type { TerminationState } from "./outbound-subscription";

// TODO: maybe we need an "attached" state too.
// TODO: maybe the inbound should maintain a reference to its outbound.

export type InboundSubscriptionState = "attaching" | "detached";

export class InboundSubscription {
  private state: InboundSubscriptionState = "attaching";

  constructor(
    public readonly id: string,
    public readonly onActivate: () => void,
    public readonly onData: (data: unknown) => void,
    public readonly onTerminate: (state: TerminationState) => void,
    public readonly onDetach: () => void,
    private readonly logger: Logger
  ) {}

  public detach() {
    if (this.state === "detached") {
      this.logger.warn(
        "Inbound subscription already detached. This is not fatal, but it's a sign of a potential performance issue."
      );

      return;
    }

    this.logger.debug("Detaching inbound subscription");

    this.state = "detached";
    this.onDetach();
  }
}
