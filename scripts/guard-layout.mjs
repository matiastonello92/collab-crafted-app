import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rootLayout = path.join(root, "app", "layout.tsx");
const ignoredDirs = new Set([
  "node_modules",
  ".git",
  ".next",
  "supabase",
  "dist",
  "build",
  "scripts",
  "api",
]);

const ignoredFiles = new Set([
  path.join(root, "scripts", "guard-layout.mjs"),
  path.join(root, "index.html"),
]);

const htmlRegex = /<\s*(html|body)\b/i;
const globalsImportRegex = /(import\s+[^;]*['"]globals\.css['"])|(from\s+['"][^'"]*globals\.css['"])|(@import\s+['"][^'"]*globals\.css['"])/i;
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mdx",
  ".css",
  ".html",
]);

const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!textExtensions.has(ext)) continue;
    if (ignoredFiles.has(fullPath)) continue;

    const contents = await readFile(fullPath, "utf8");

    if (fullPath !== rootLayout && htmlRegex.test(contents)) {
      violations.push(`Found <html>/<body> tag in ${path.relative(root, fullPath)}`);
    }

    if (fullPath !== rootLayout && globalsImportRegex.test(contents)) {
      violations.push(`Found globals.css import in ${path.relative(root, fullPath)}`);
    }
  }
}

try {
  await walk(root);
} catch (error) {
  console.error("guard:layout failed to scan project:", error);
  process.exit(1);
}

if (violations.length > 0) {
  console.error("Layout guard detected the following violations:\n");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log("Layout guard passed: html/body tags and globals.css import are confined to app/layout.tsx");
