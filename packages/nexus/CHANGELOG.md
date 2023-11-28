# @whatsgood/nexus

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
