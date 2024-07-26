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
![Docker Image Size (tag)](https://img.shields.io/docker/image-size/whatsgood/nexus/latest?logo=docker&label=Docker)

  <!-- ![GitHub stars](https://img.shields.io/github/stars/whats-good/nexus?style=social&label=Star) -->

</div>

</div>

## Introduction

Welcome to `Nexus` - a load balancing blockchain RPC reverse proxy written in TypeScript.

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

```typescript
// node.js standalone server example

import { Nexus, NodeProvider, CHAIN } from "@whatsgood/nexus";
import { createServer } from "node:http";

const llamaRpcNodeProvider = new NodeProvider({
  name: "llama-rpc",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: "https://eth.llamarpc.com",
});

const tenderlyNodeProvider = new NodeProvider({
  name: "tenderly",
  chain: CHAIN.ETHEREUM_MAINNET,
  url: "https://gateway.tenderly.co/public/mainnet",
});

const nexus = Nexus.create({
  nodeProviders: [llamaRpcNodeProvider, tenderlyNodeProvider],
  port: 4000,
});

createServer(nexus).listen(nexus.port, () => {
  console.log(`🚀 Server ready at http://localhost:${nexus.port}`);
});
```

## Interaction

In this example, since we have configured the server to connect to `Ethereum Mainnet`, we supply the chain id = `1` as the endpoint.

```bash
curl \
    -X POST http://localhost:4000/1 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

```

<!-- TODO: remove the nexus/README.md from version control, and only generate it pre npm publish -->
