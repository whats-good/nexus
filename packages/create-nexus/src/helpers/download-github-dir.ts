import path from "path";
import fs from "fs";

const GITHUB_API_BASE = "https://api.github.com/repos";

export async function downloadGitHubDir(
  {
    owner,
    repo,
    dirPath,
  }: {
    owner: string;
    repo: string;
    dirPath: string;
  },
  targetDir
) {
  // Fetch the directory content

  const nodeFetch = await import("node-fetch");
  const response = await nodeFetch.default(
    `${GITHUB_API_BASE}/${owner}/${repo}/contents/${dirPath}`
  );
  const directoryContent = await response.json();
  if (!Array.isArray(directoryContent)) {
    console.error("URL does not point to a directory or an error occurred");
    return;
  }
  // Download each file in the directory
  for (const item of directoryContent) {
    if (item.type === "file") {
      console.log(`Downloading ${path.join(dirPath, item.name)}...`);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);
      }
      await downloadFile(item.download_url, path.join(targetDir, item.name));
    } else {
      console.log(`Creating directory ${path.join(item.name)}...`);
      await downloadGitHubDir(
        {
          owner,
          repo,
          dirPath: path.join(dirPath, item.name),
        },
        path.join(targetDir, item.name)
      );
    }
  }
}

async function downloadFile(fileUrl: string, outputPath: string) {
  const nodeFetch = await import("node-fetch");
  const response = await nodeFetch.default(fileUrl);
  const fileStream = fs.createWriteStream(outputPath);
  if (!fileStream) {
    console.error(`Could not write to file ${outputPath}`);
    process.exit(1);
  }
  if (!response.body) {
    console.error(`Could not read response body`);
    process.exit(1);
  }
  response.body.pipe(fileStream);
}
