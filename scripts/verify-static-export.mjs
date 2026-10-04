import { cp, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("out");

// Include the complete asset tree even when a cached Next.js export omits files.
if (!process.argv.includes("--check")) {
  await cp(path.resolve(".next/static"), path.join(output, "_next/static"), {
    recursive: true,
    force: true,
  });
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  }));
  return files.flat();
}

const missing = new Set();
let pages = 0;
for (const file of await filesIn(output)) {
  if (!file.endsWith(".html") && !file.endsWith(".css")) continue;
  const contents = await readFile(file, "utf8");
  if (file.endsWith(".html")) {
    pages++;
    if (!/<link\b[^>]*rel="stylesheet"/.test(contents)) {
      throw new Error(`Exported page has no stylesheet: ${path.relative(output, file)}`);
    }
  }
  for (const match of contents.matchAll(/\/_next\/static\/[^\s"'<>\\)]+/g)) {
    const asset = match[0].split(/[?#]/)[0];
    try {
      const info = await stat(path.join(output, decodeURIComponent(asset)));
      if (!info.isFile() || !info.size) missing.add(asset);
    } catch {
      missing.add(asset);
    }
  }
}

if (!pages) throw new Error("No HTML pages found in the static export.");
if (missing.size) {
  throw new Error(`Static export references missing assets:\n${[...missing].join("\n")}`);
}
console.log(`Verified ${pages} static pages and their CSS, JavaScript and font assets.`);
