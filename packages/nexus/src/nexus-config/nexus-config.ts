import type { RelayConfig } from "@src/node-endpoint";
import type { NodeProvider } from "@src/node-provider";

export interface NexusConfig {
  nodeProviders: NodeProvider[]; // TODO: make this a tuple
  relay: RelayConfig;
  port: number;
}
