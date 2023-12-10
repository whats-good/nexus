export const VALID_PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"];

export type PackageManager = (typeof VALID_PACKAGE_MANAGERS)[number];

export function getPackageManagerFromEnv(): PackageManager {
  const userAgent = process.env.npm_config_user_agent || "";

  if (userAgent.startsWith("yarn")) {
    return "yarn";
  }

  if (userAgent.startsWith("pnpm")) {
    return "pnpm";
  }

  return "npm";
}
