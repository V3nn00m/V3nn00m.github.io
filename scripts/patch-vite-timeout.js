/**
 * Patch Vite's hardcoded transport invoke timeout from 60s to 180s.
 *
 * The "transport invoke timed out after 60000ms" error happens because
 * Vite's module-runner uses a hardcoded 60s default for transport.timeout.
 * On Windows with many markdown files + Tailwind CSS, this isn't enough.
 *
 * This script patches the default from 6e4 (60000ms) to 18e4 (180000ms).
 *
 * Run via: node scripts/patch-vite-timeout.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// Find the real vite directory under pnpm's .pnpm store
function findViteDir() {
  // First try the direct symlink
  const directPath = resolve(projectRoot, "node_modules/vite");
  if (existsSync(join(directPath, "dist"))) {
    return directPath;
  }

  // Search in pnpm store
  const pnpmDir = resolve(projectRoot, "node_modules/.pnpm");
  if (!existsSync(pnpmDir)) {
    return null;
  }

  const entries = readdirSync(pnpmDir);
  for (const entry of entries) {
    if (entry.startsWith("vite@")) {
      const vitePath = join(pnpmDir, entry, "node_modules/vite");
      if (existsSync(join(vitePath, "dist"))) {
        return vitePath;
      }
    }
  }
  return null;
}

const viteDir = findViteDir();
if (!viteDir) {
  console.error("❌ Could not find Vite installation directory");
  process.exit(1);
}

console.log(`📦 Found Vite at: ${viteDir}`);

const filesToPatch = [
  "dist/node/module-runner.js",
  "dist/client/client.mjs",
  "dist/client/bundledDevClient.mjs",
];

let patchCount = 0;
const search = "transport.timeout ?? 6e4";
const replace = "transport.timeout ?? 18e4";

for (const relPath of filesToPatch) {
  const filePath = resolve(viteDir, relPath);
  try {
    let content = readFileSync(filePath, "utf-8");
    if (content.includes(search)) {
      content = content.replaceAll(search, replace);
      writeFileSync(filePath, content, "utf-8");
      console.log(`✅ Patched: ${relPath}`);
      patchCount++;
    } else if (content.includes(replace)) {
      console.log(`⏭️  Already patched: ${relPath}`);
    } else {
      console.log(`⚠️  Pattern not found in: ${relPath}`);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log(`⏭️  File not found (skipping): ${relPath}`);
    } else {
      console.error(`❌ Error patching ${relPath}:`, err.message);
    }
  }
}

console.log(`\nDone! Patched ${patchCount} file(s).`);
