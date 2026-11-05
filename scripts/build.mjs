#!/usr/bin/env node
// Builds dist/<name>.js (the single file HACS ships) by concatenating src/*.js in file-name order, wrapped in an IIFE so that
// several SF-* plugins can be loaded on the same dashboard without clashing on top-level names, then minifying with esbuild
// (smaller download, same behaviour — src/ stays the readable source of truth). The same file is copied to docs/ for the demo page.
//   node scripts/build.mjs          write dist/ and docs/
//   node scripts/build.mjs --check  fail (exit 1) if the committed copies differ from what src/ builds
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const hacsInfo = JSON.parse(fs.readFileSync(path.join(root, "hacs.json"), "utf8"));
const name = hacsInfo.filename;
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const flagVar = "SF_" + hacsInfo.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^SF_/, "") + "_VERSION"; // e.g. SF_HEARTBEAT_VERSION
const consoleTag = hacsInfo.name.toUpperCase().replace(/\s+/g, "-"); // e.g. SF-HEARTBEAT
const files = fs.readdirSync(path.join(root, "src")).filter((f) => f.endsWith(".js")).sort();
if (!files.length) { console.error("build: src/ is empty"); process.exit(2); }
const body = files.map((f) => fs.readFileSync(path.join(root, "src", f), "utf8")).join("");
// Version banner + duplicate-resource guard (same pattern as SF-Cards): if the resource is declared twice (HACS + manual file), the first
// loaded version stays active and a clear console warning says so, instead of silently redefining the custom elements a second time.
const wrapped = "if (window." + flagVar + ") {\n"
  + "  console.warn(`" + hacsInfo.name + " ${window." + flagVar + "} is already loaded: this copy (v" + version + ") is ignored. Remove the duplicate resource (Settings → Dashboards → Resources).`);\n"
  + "} else {\n"
  + "window." + flagVar + " = \"" + version + "\";\n"
  + "(() => {\n\"use strict\";\n" + body + "\n})();\n"
  + "console.info(\"%c " + consoleTag + " %c v" + version + " \", \"color:#03080f;background:#00e5ff;font-weight:700\", \"color:#00e5ff;background:#03080f\");\n"
  + "}\n";
const result = esbuild.transformSync(wrapped, { minify: true, target: "es2020", loader: "js" });
const out = Buffer.from(result.code, "utf8");
const targets = [`dist/${name}`, `docs/${name}`];

if (process.argv.includes("--check")) {
  const stale = targets.filter((t) => { try { return !fs.readFileSync(path.join(root, t)).equals(out); } catch { return true; } });
  if (stale.length) { console.error(`build: ${stale.join(", ")} differ(s) from src/ — run "node scripts/build.mjs" and commit the result`); process.exit(1); }
  console.log(`OK: dist/ and docs/ are up to date with src/ (${files.length} files, ${wrapped.length} -> ${out.length} bytes minified)`);
} else {
  for (const t of targets) { fs.mkdirSync(path.dirname(path.join(root, t)), { recursive: true }); fs.writeFileSync(path.join(root, t), out); }
  console.log(`built ${targets.join(" + ")} from ${files.length} files (${wrapped.length} -> ${out.length} bytes minified)`);
}
