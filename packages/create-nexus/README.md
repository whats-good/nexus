# Create Nexus

This CLI tool enables you to quickly start building a new [@whatsgood/nexus](https://www.npmjs.com/package/@whatsgood/nexus) RPC application.

## Interactive

You can create a new project by running:

```
npm init @whatsgood/nexus
# or
yarn create @whatsgood/nexus
# or
pnpm create @whatsgood/nexus
# or
bun create @whatsgood/nexus

```

## Non-Interactive

You cn also pass command line arguments to set up a new project non-interactively. See `@whatsgood/nexus --help`

```
Usage: @whatsgood/create-nexus [project-name] [options]

Arguments:
  project-name                               name of your nexus rpc project

Options:
  -v, --version                              output the current version
  --path <project-path>                      project path
  --yes                                      skip the confirmation step
  --package-manager, --pm <package-manager>  package manager to use
  --platform <platform>                      platform to use
  -h, --help                                 display help for command
```
