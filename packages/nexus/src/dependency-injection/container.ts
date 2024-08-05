import { Container } from "inversify";

export const container = new Container({
  autoBindInjectable: true,
  skipBaseClassChecks: true,
  defaultScope: "Singleton",
});
