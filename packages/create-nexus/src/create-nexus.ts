import fs from "fs";
import chalk from "chalk";
import path from "path";
import * as commander from "commander";
import prompts from "prompts";
import validateNpmPackageName from "validate-npm-package-name";
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
  bun: {
    referenceGitHubDirectory: "examples/bun-ts-server",
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

  if (!platform) {
    platform = await prompts({
      type: "select",
      name: "platform",
      message: "What platform are you targeting?",
      choices: VALID_PLATFORMS.map((p) => ({ title: p, value: p })),
      validate: validatePlatform,
    });
  }
  return platform;
}

function validateProjectName(name: string) {
  const { validForNewPackages, errors } = validateNpmPackageName(name);
  if (!validForNewPackages) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${name}"`
      )} because of npm naming restrictions:`
    );
    errors?.forEach((err) => {
      console.error(`    ${chalk.red.bold("*")} ${err}`);
    });
    process.exit(1);
  }
  return name;
}

async function getProjectPathAndName(program: commander.Command) {
  const projectNameArg = program.args[0];
  let projectName = projectNameArg;

  if (!projectNameArg) {
    // prompt for project name
    const res = await prompts({
      type: "text",
      name: "projectName",
      initial: "my-nexus-rpc",
      message: "What is your project name?",
      validate: validateProjectName,
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

  return { projectPath: resolvedProjectPath, projectName };
}

type ProjectConfig = {
  projectName: string;
  projectPath: string;
  pkgManager: string;
  platform: Platform;
  autoConfirm: boolean;
  noGit: boolean;
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

function validatePlatform(value: string) {
  if (!Object.keys(PLATFORMS).includes(value)) {
    console.error(
      `Invalid platform: ${chalk.red(
        `"${value}"`
      )}. Must be one of: ${Object.keys(PLATFORMS).join(", ")}`
    );
    process.exit(1);
  }
  return value;
}

export async function init() {
  const packageJson = getPackageJson(
    path.join(__dirname, "..", "package.json")
  );
  const program = new commander.Command(packageJson.name)
    .version(packageJson.version, "-v, --version", "output the current version")
    .argument(
      "[project-name]",
      "name of your nexus rpc project",
      validateProjectName
    )
    .usage(`${chalk.green("[project-name]")} [options]`)
    .option("--path <project-path>", "project path")

    // TODO: add verbose and info support
    // .option("--verbose", "print additional logs")
    // .option("--info", "print environment debug info")
    .option("--yes", "skip the confirmation step")
    .option("--no-git", "skip git initialization")
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

    // TODO: add git support
    // .option("--no-git", "Skip git initialization")

    .option("--platform <platform>", "platform to use", validatePlatform)
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
    noGit: program.opts().noGit,
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

async function updatePackageJson(config: ProjectConfig) {
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
  generatedPackageJson.name = config.projectName;
  fs.writeFileSync(
    generatedPackageJsonPath,
    JSON.stringify(generatedPackageJson, null, 2)
  );
}

async function generateEnvFiles(config: ProjectConfig) {
  console.log(`${chalk.green("Generating environment files...")}`);
  const { platform } = config;
  const file = platform === "cloudflare" ? ".dev.vars" : ".env";

  const envVars = [
    "# All clients must supply their requests with ?key=XXXXX. Set your global key value here.",
    "NEXUS_GLOBAL_ACCESS_KEY=",
    "\n",
    "# Add your service provider keys here",
    "ALCHEMY_KEY=",
    "INFURA_KEY=",
    "ANKR_KEY=",
  ];

  fs.writeFileSync(path.join(config.projectPath, file), envVars.join("\n"));
}

async function configGit(config: ProjectConfig) {
  console.log(`${chalk.green("Generating .gitignore...")}`);

  const gitignoreReference = fs.readFileSync(
    path.join(__dirname, "../.gitignore.reference")
  );

  fs.writeFileSync(
    path.join(config.projectPath, ".gitignore"),
    gitignoreReference
  );

  if (config.noGit) {
    console.log(`${chalk.green("Skipping git initialization")}`);
  } else {
    console.log(`${chalk.green("Initializing git...")}`);
    const childProcess = await import("child_process");
    childProcess.execSync("git init", {
      cwd: config.projectPath,
      stdio: "inherit",
    });
    childProcess.execSync("git add .", {
      cwd: config.projectPath,
      stdio: "inherit",
    });
    childProcess.execSync('git commit -m "Initial commit"', {
      cwd: config.projectPath,
      stdio: "inherit",
    });
  }
}

async function installDependencies(config: ProjectConfig) {
  const { pkgManager, projectPath } = config;

  // TODO: standardize chalk.green, chalk.cyan, and how `...` is colored

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
  await updatePackageJson(config);
  await generateEnvFiles(config);
  await installDependencies(config);
  await configGit(config);
}
