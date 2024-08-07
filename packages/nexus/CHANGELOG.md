# @whatsgood/nexus

## 0.26.0

### Minor Changes

- a9a2496: Introducing subscription sharing
- ae511a1: Subscription sharing can be turned off via config or environment variables

## 0.25.0

### Minor Changes

- be82f82: Introducing inversify for ioc

## 0.24.0

### Minor Changes

- 97bf30f: RpcContext moved out of the dependency-injection module
- 97bf30f: Created a container.getLogger function

### Patch Changes

- 5487681: Moving http modules into 'http'

## 0.23.1

### Patch Changes

- cffcd19: RpcContext api no longer separates the request from its id

## 0.23.0

### Minor Changes

- 27eefb7: Made RpcContext transport-independent. Middleware can be reused between http and websockets

## 0.22.0

### Minor Changes

- 2495356: Removing TPlatformContext generics

## 0.21.0

### Minor Changes

- e9fe592: Logging overhaul for enhanced metadata in logs
- 100c058: Event handlers overhaul

## 0.20.0

### Minor Changes

- 37f1134: WebSockets now enabled via nexus.ws(server: Server)

## 0.19.0

### Minor Changes

- 5bb3157: Introducing experimental WebSocket support

## 0.18.0

### Minor Changes

- 96454e7: Revamped request and response logging

## 0.17.0

### Minor Changes

- abb06cd: Introducing weighted load balancing

## 0.16.0

### Minor Changes

- bc2eceb: Updated default port references

## 0.15.0

### Minor Changes

- 811fc4b: Introducing standard environment variables

## 0.14.0

### Minor Changes

- b7fd417: Allowing a partial config for RelayConfig

## 0.13.0

### Minor Changes

- b3f0396: Complete rewrite and overhaul

## 0.12.0

### Minor Changes

- 4ed911a: Refactored the nexus system

## 0.11.0

### Minor Changes

- 135c567: Introducing caching and method descriptors

## 0.10.0

### Minor Changes

- c40d25b: Introducing method-descriptors: a type-safety measure to describe rpc methods

## 0.9.0

### Minor Changes

- d2fdc7a: Using @whatwg-node/fetch instead of out of the box fetch api

## 0.8.0

### Minor Changes

- 0e37a90: Added base-sepoli & alchemy support

## 0.7.0

### Minor Changes

- 5028b97: Updated @whatwg-node/server version

## 0.6.0

### Minor Changes

- 97a0603: Added logger extensions
- 6445de4: Pino selected as the default logger

## 0.5.0

### Minor Changes

- d39cf30: Relaxed ServerContext generic type requirements
- d39cf30: Added hardhat and foundry to default providers

## 0.4.0

### Minor Changes

- 449b332: Improved chain support error messages

## 0.3.0

### Minor Changes

- 36c5976: Supporting nested routes. No longer required to run at path root.
- 3f6c2f6: NexusServer replaced with Nexus. Typecasting ServerAdapter.ServerContext for Express.js compatibility

## 0.2.1

### Patch Changes

- 97d902b: fixed bug on optional method params

## 0.2.0

### Minor Changes

- 6f49cd0: chains need to be explicitly configured via config now
- 9582453: default registry no longer global singleton
- 9def7a8: Implicit config derivations from env vars removed. All configs should be explicit moving forward.
- 6f49cd0: Global singleton registry exported now. Clients can now extend the registry to change chain, network and provider behavior

### Patch Changes

- 6f49cd0: requiring provider configs
- cc464ba: Updated registry override behavior: additional chain support statements will override previous ones for the same chain id

## 0.1.0

### Minor Changes

- 3503f54: created a new unified and reusable registry class, along with builders
- 3503f54: streamlined env vars for provider keys
- 3503f54: simplified provider configuration via string arrays
- f95431e: Universal server adapter created. All integrations will now use the @whatwg-node/server adapters.

### Patch Changes

- 3503f54: improved logging and error reporting
- fd24420: Reverted back to single-entrypoint module, in alignment with whatwg-node/server

## 0.0.8

### Patch Changes

- 7f6147c: logs now show the jsonrpc requests and json rpc responses

## 0.0.7

### Patch Changes

- c31b125: fixed access control bug introduced in latest release

## 0.0.6

### Patch Changes

- 30094ad: multi-entrypoint builds added
- 30094ad: introduced AbstractRequestHandler for cross-platform extensions
- 578b242: tsup builds with code splitting
- 30094ad: Introducing esm builds
- 30094ad: Nexus class created as main library and config object
- 30094ad: whatwg-node integrated for cross-platform support
- 30094ad: Config object can now disable providers

## 0.0.5

### Patch Changes

- 4b421a7: Fixed tests to account for the newly added base-goerli providers

## 0.0.4

### Patch Changes

- e3e4864: added base sepolia and additional base-goerli configurations
- 5bc7ae6: separating between error logs and warning logs

## 0.0.3

### Patch Changes

- 95d6013: Readme now reads from generated banner
- 95d6013: Added package.json description, categories and repo

## 0.0.2

### Patch Changes

- b115b42: Docs added, tests fixed, proxy functional.
