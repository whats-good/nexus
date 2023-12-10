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
// Cloudflare worker example

import { Nexus } from "@whatsgood/nexus";

type Env = Record<string, string>;

const nexus = Nexus.create<Env>({
  providers: (ctx) => [
    {
      name: "alchemy",
      key: ctx.ALCHEMY_KEY,
    },
    {
      name: "infura",
      key: ctx.INFURA_KEY,
    },
    {
      name: "ankr",
      key: ctx.ANKR_KEY,
    },
  ],
  globalAccessKey: (ctx) => ctx.NEXUS_GLOBAL_ACCESS_KEY,
  chains: [1],
});

export default {
  fetch: nexus.fetch,
};
```

<!-- TODO: remove the nexus/README.md from version control, and only generate it pre npm publish -->
