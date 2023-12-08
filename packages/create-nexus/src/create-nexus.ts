#!/usr/bin/env node

import fs from "fs";
import chalk from "chalk";
import path from "path";
import * as commander from "commander";
import prompts from "prompts";
import validateProjectName from "validate-npm-package-name";
import packageJson from "../package.json";
import { getPkgManager } from "./helpers/get-pkg-manager";
import { downloadGitHubDir } from "./helpers/download-github-dir";

function getPackageManager(program: commander.Command) {
  const options = program.opts();
  return !!options.useNpm
    ? "npm"
    : !!options.usePnpm
    ? "pnpm"
    : !!options.useYarn
    ? "yarn"
    : getPkgManager();
}

const PLATFORMS = {
  express: {
    referenceGitHubDirectory: "examples/express-ts-server",
  },
  node: {
    referenceGitHubDirectory: "examples/nodejs-standalone-server",
  },
  cloudflare: {
    referenceGitHubDirectory: "examples/cloudflare-worker",
  },
} as const;

type Platform = keyof typeof PLATFORMS;

async function getPlatform(program: commander.Command) {
  const VALID_PLATFORMS = Object.keys(PLATFORMS) as unknown as Platform[];
  let platform = program.opts().platform;

  if (typeof platform === "string") {
    platform = platform.trim();

    if (VALID_PLATFORMS.includes(platform)) {
      return platform;
    } else {
      console.error(
        `Invalid platform: ${chalk.red(
          `"${platform}"`
        )}. Must be one of: ${VALID_PLATFORMS.join(", ")}`
      );
      process.exit(1);
    }
  } else {
    const res = await prompts({
      type: "select",
      name: "platform",
      message: "What platform are you targeting?",
      choices: VALID_PLATFORMS.map((p) => ({ title: p, value: p })),
    });

    return res.platform;
  }
}

async function getProjectPathAndName(program: commander.Command) {
  const projectName = program.args[0];
  let projectPath: string | undefined = program.opts().path;

  if (typeof projectPath === "string") {
    projectPath = projectPath.trim();
  } else {
    projectPath = projectName;
  }

  const resolvedProjectPath = path.resolve(projectPath);

  const { validForNewPackages, errors } = validateProjectName(projectName);
  if (!validForNewPackages) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${projectName}"`
      )} because of npm naming restrictions:`
    );
    errors?.forEach((err) => {
      console.error(`    ${chalk.red.bold("*")} ${err}`);
    });
    process.exit(1);
  }

  return { projectPath: resolvedProjectPath, projectName };
}

type ProjectConfig = {
  projectName: string;
  projectPath: string;
  pkgManager: string;
  platform: Platform;
  autoConfirm: boolean;
};

async function confirmProjectConfig(
  program: commander.Command,
  config: ProjectConfig
) {
  const { projectName, projectPath, pkgManager, platform, autoConfirm } =
    config;

  if (autoConfirm) {
    console.log(
      `Creating a new Nexus RPC project in ${chalk.green(projectPath)}.`
    );
    return;
  }

  const res = await prompts({
    name: "confirm",
    type: "confirm",
    message: `About to create a new Nexus RPC project in ${chalk.green(
      projectPath
    )}. Continue?`,
  });

  if (!res.confirm) {
    console.log("Aborting...");
    process.exit(1);
  }
}

export async function init() {
  const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .arguments("<project-name>")
    .usage(`${chalk.green("<project-name>")} [options]`)
    .option("--path <project-path>", "project path")
    .option("--verbose", "print additional logs")
    .option("--info", "print environment debug info")
    .option(
      "--yes",
      "skip confirmation step and automatically create the project"
    )
    .on("--help", () => {
      console.log(
        `    Only ${chalk.green("<project-directory>")} is required.`
      );
      console.log();
    })
    // .option(
    //   "--ts, --typescript",
    //   "Initialize as a TypeScript project. (default)"
    // )
    // .option("--js, --javascript", "Initialize as a JavaScript project.")
    // TODO: add js support
    .option(
      "--use-npm",
      "Explicitly tell the CLI to bootstrap the application using npm"
    )
    .option(
      "--use-pnpm",
      "Explicitly tell the CLI to bootstrap the application using pnpm"
    )
    .option(
      "--use-yarn",
      "Explicitly tell the CLI to bootstrap the application using Yarn"
    )
    // TODO: add bun support

    // TODO: add git support
    // .option("--no-git", "Skip git initialization")

    .option("--platform <platform>", "Platform to use")
    .parse(process.argv);

  const pkgManager = getPackageManager(program);
  const platform = await getPlatform(program);
  const { projectName, projectPath } = await getProjectPathAndName(program);

  const projectConfig: ProjectConfig = {
    pkgManager,
    platform,
    projectName,
    projectPath,
    autoConfirm: program.opts().yes,
  };

  const root = path.resolve(projectConfig.projectPath);

  const folderExists = fs.existsSync(root);
  if (folderExists) {
    console.error(
      `Cannot create a project under ${chalk.green(
        path.basename(root)
      )} because ${chalk.red(projectPath)} already exists.`
    );
    process.exit(1);
  }

  await confirmProjectConfig(program, projectConfig);

  await createProject(projectConfig);
}

async function setNexusPackageVersion(config: ProjectConfig) {
  const currentNexusVersion = packageJson.dependencies["@whatsgood/nexus"];
  const generatedPackageJsonPath = path.join(
    config.projectPath,
    "package.json"
  );
  const generatedPackageJson = JSON.parse(
    fs.readFileSync(generatedPackageJsonPath, "utf-8")
  );
  generatedPackageJson.dependencies["@whatsgood/nexus"] = currentNexusVersion;
  fs.writeFileSync(
    generatedPackageJsonPath,
    JSON.stringify(generatedPackageJson, null, 2)
  );
}

async function installDependencies(config: ProjectConfig) {
  const { pkgManager, projectPath } = config;

  console.log(
    `${chalk.green("Installing dependencies using: ")} ${chalk.cyan(
      pkgManager
    )}...`
  );

  const childProcess = await import("child_process");
  childProcess.execSync(`${pkgManager} install`, {
    cwd: projectPath,
    stdio: "inherit",
  });
}

async function createProject(config: ProjectConfig) {
  const { referenceGitHubDirectory } = PLATFORMS[config.platform];
  await downloadGitHubDir(
    {
      dirPath: referenceGitHubDirectory,
      owner: "whats-good",
      repo: "nexus",
    },
    config.projectPath
  );
  // TODO: add a setting to allow users to choose their version
  // TODO: add a README to this "create" project
  // TODO: generate .env files
  // TODO: if cloudflare worker, generate wrangler.toml and .dev.vars
  // TODO: generate .gitignore
  await setNexusPackageVersion(config);
  await installDependencies(config);
}
