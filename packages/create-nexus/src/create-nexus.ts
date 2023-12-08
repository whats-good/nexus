import fs from "fs";
import chalk from "chalk";
import path from "path";
import * as commander from "commander";
import prompts from "prompts";
import validateProjectName from "validate-npm-package-name";
import {
  VALID_PACKAGE_MANAGERS,
  getPackageManagerFromEnv,
} from "./helpers/get-pkg-manager";
import { downloadGitHubDir } from "./helpers/download-github-dir";

function getPackageJson(path) {
  return require(path);
}

function getPackageManager(program: commander.Command) {
  const options = program.opts();
  return options.packageManager || getPackageManagerFromEnv();
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
  const projectNameArg = program.args[0];
  let projectName = projectNameArg;

  if (!projectNameArg) {
    // prompt for project name
    const res = await prompts({
      type: "text",
      name: "projectName",
      message: "What is your project name?",
      validate: (name) => {
        const { validForNewPackages, errors } = validateProjectName(name);
        if (!validForNewPackages) {
          return errors?.join("\n");
        }
        return true;
      },
    });

    if (!res.projectName) {
      console.error("A project name is required.");
      process.exit(1);
    }

    projectName = res.projectName;
  }

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
  const packageJson = getPackageJson(
    path.join(__dirname, "..", "package.json")
  );
  const program = new commander.Command(packageJson.name)
    .version(packageJson.version, "-v, --version", "output the current version")
    .argument("[project-name]", "name of your nexus rpc project")
    .usage(`${chalk.green("[project-name]")} [options]`)
    .option("--path <project-path>", "project path")

    // TODO: add verbose and info support
    // .option("--verbose", "print additional logs")
    // .option("--info", "print environment debug info")
    .option("--yes", "skip the confirmation step")
    // .option(
    //   "--ts, --typescript",
    //   "Initialize as a TypeScript project. (default)"
    // )
    // .option("--js, --javascript", "Initialize as a JavaScript project.")
    // TODO: add js support

    .option(
      "--package-manager, --pm <package-manager>",
      "package manager to use",
      function (value) {
        if (!VALID_PACKAGE_MANAGERS.includes(value)) {
          console.error(
            `Invalid package manager: ${chalk.red(
              `"${value}"`
            )}. Must be one of: ${VALID_PACKAGE_MANAGERS.join(", ")}`
          );
          process.exit(1);
        }
        return value;
      }
    )
    // TODO: add bun support

    // TODO: add git support
    // .option("--no-git", "Skip git initialization")

    .option("--platform <platform>", "platform to use")
    .parse(process.argv);

  const { projectName, projectPath } = await getProjectPathAndName(program);
  const pkgManager = getPackageManager(program);
  const platform = await getPlatform(program);

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
  const packageJson = getPackageJson(
    path.join(__dirname, "..", "package.json")
  );
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
