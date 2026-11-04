#!/usr/bin/env node
// Builds dist/<name>.js (the single file HACS ships) by concatenating src/*.js in file-name order, wrapped in an IIFE so that
// several SF-* plugins can be loaded on the same dashboard without clashing on top-level names. The same file is copied to docs/ for the demo page.
//   node scripts/build.mjs          write dist/ and docs/
//   node scripts/build.mjs --check  fail (exit 1) if the committed copies differ from what src/ builds
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = JSON.parse(fs.readFileSync(path.join(root, "hacs.json"), "utf8")).filename;
const files = fs.readdirSync(path.join(root, "src")).filter((f) => f.endsWith(".js")).sort();
if (!files.length) { console.error("build: src/ is empty"); process.exit(2); }
const body = files.map((f) => fs.readFileSync(path.join(root, "src", f), "utf8")).join("");
const out = Buffer.from(`(() => {\n"use strict";\n${body}\n})();\n`);
const targets = [`dist/${name}`, `docs/${name}`];

if (process.argv.includes("--check")) {
  const stale = targets.filter((t) => { try { return !fs.readFileSync(path.join(root, t)).equals(out); } catch { return true; } });
  if (stale.length) { console.error(`build: ${stale.join(", ")} differ(s) from src/ — run "node scripts/build.mjs" and commit the result`); process.exit(1); }
  console.log(`OK: dist/ and docs/ are up to date with src/ (${files.length} files, ${out.length} bytes)`);
} else {
  for (const t of targets) { fs.mkdirSync(path.dirname(path.join(root, t)), { recursive: true }); fs.writeFileSync(path.join(root, t), out); }
  console.log(`built ${targets.join(" + ")} from ${files.length} files (${out.length} bytes)`);
}
