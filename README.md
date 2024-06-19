<div align="center">

![hero banner with nexus dog](./docs/images/nexus-hero-banner.svg)

<div>

![npm version](https://img.shields.io/npm/v/@whatsgood/nexus)
![npm downloads](https://img.shields.io/npm/dm/@whatsgood/nexus)
<a href="https://nexus.whatsgood.dog/" target="_blank"><img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" /></a>
<a href="https://github.com/whats-good/nexus/graphs/commit-activity" target="_blank"><img alt="Maintenance" src="https://img.shields.io/badge/maintained%3F-yes-green.svg" /></a>
<a href="#" target="_blank"><img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-yellow.svg" /></a>

</div>

<div>

![Discord](https://img.shields.io/discord/1003351311904948334?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)
![GitHub Actions Status](https://github.com/whats-good/nexus/actions/workflows/main-ci.yml/badge.svg)

  <!-- ![GitHub stars](https://img.shields.io/github/stars/whats-good/nexus?style=social&label=Star) -->

</div>

</div>

## Introduction

Welcome to `Nexus` - a simple TypeScript proxy server for any [Ethereum JSON RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/) compliant blockchain. Instead of connecting your dApps to a blockchain node, you can connect them to `Nexus` and `Nexus` serves the requests for you. `Nexus` is open source and free to use.

## Documentation

Check out our [documentation](https://nexus.whatsgood.dog) for detailed instructions.

## Installation

```sh
# npm
npm install @whatsgood/nexus

# pnpm
pnpm install @whatsgood/nexus

# yarn
yarn add @whatsgood/nexus

```

## Quickstart

```ts
// node.js standalone server example

import { Nexus, NodeProvider, CHAIN } from "@whatsgood/nexus";
import { createServer } from "node:http";

const alchemyNodeProvider = new NodeProvider({
  name: "alchemy",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: process.env.ALCHEMY_URL,
});

const infuraNodeProvider = new NodeProvider({
  name: "infura",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: process.env.INFURA_URL,
});

const nexus = Nexus.create({
  nodeProviders: [alchemyNodeProvider, infuraNodeProvider],
  port: 4005,
  log: { level: "debug" },
  relay: {
    failure: {
      kind: "cycle-requests",
      maxAttempts: 3,
    },
    order: "random",
  },
});

createServer(nexus).listen(nexus.port, () => {
  console.log(`🚀 Server ready at http://localhost:${nexus.port}`);
});
```

## Interaction

In this example, since we have configured the server to connect to `Ethereum Mainnet`, we supply the chain id = `1` as the endpoint.

```bash
curl \
    -X POST http://localhost:4005/1 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

```

<!-- TODO: remove the nexus/README.md from version control, and only generate it pre npm publish -->
