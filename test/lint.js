// Reliability rules on the readable src/*.js files (same philosophy as SF-Cards' test/lint.js). Non-zero exit code if a rule fails.
const fs = require("fs");
const path = require("path");
const srcDir = path.join(__dirname, "..", "src");
const srcFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith(".js")).sort();

// lines[] / fileOfLine[] / lineOfLine[]: built file by file so the file:line of each concatenation line is exact, with one blank separator
// line kept between files (never matched by the rules below, which all look for real code).
const lines = [], fileOfLine = [], lineOfLine = [];
srcFiles.forEach((f, fi) => {
  const fileLines = fs.readFileSync(path.join(srcDir, f), "utf8").split("\n");
  fileLines.forEach((l, j) => { lines.push(l); fileOfLine.push(f); lineOfLine.push(j + 1); });
  if (fi < srcFiles.length - 1) { lines.push(""); fileOfLine.push(f); lineOfLine.push(fileLines.length + 1); }
});
const src = lines.join("\n"), bad = [];
const at = (i) => `src/${fileOfLine[i] || "?"}:${lineOfLine[i] ?? i + 1}`;

// 1. Every setInterval stored in this.X must have its clearInterval(this.X) (a card that forgets this leaks a timer every time it is removed
// from a dashboard and re-added, e.g. switching tabs).
for (const m of src.matchAll(/this\.(_\w+)\s*=\s*setInterval\(/g)) if (!new RegExp(`clearInterval\\(this\\.${m[1]}\\b`).test(src)) bad.push(`setInterval stored in this.${m[1]} without a matching clearInterval`);
for (const m of src.matchAll(/(^|[^.\w=])setInterval\(/gm)) { const i = src.slice(0, m.index).split("\n").length - 1; if (!/=\s*setInterval\(/.test(lines[i])) bad.push(`${at(i)} : setInterval whose id is not kept (cannot be stopped)`); }

// 2. Colours go through the theme tokens (00-kit.js's SF_VARS_DARK / SF_VARS_LIGHT, consumed as var(--sf-*)): a hard-coded colour in a card
// module would stay dark-themed (or wrong) in the light theme. 00-kit.js itself (the token definitions) is the only allowed exception.
for (const f of srcFiles.filter((x) => x !== "00-kit.js")) {
  fs.readFileSync(path.join(srcDir, f), "utf8").split("\n").forEach((l, i) => {
    const t = l.trim(); if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return;
    for (const m of l.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d[^)]*\)/g)) bad.push(`src/${f}:${i + 1}: hard-coded colour ${m[0]} (use a var(--sf-*) token from 00-kit.js)`);
  });
}

if (bad.length) { console.log("FAIL lint: " + bad.length + " problem(s)"); bad.forEach((b) => console.log(" - " + b)); process.exit(1); }
console.log("OK: reliability rules respected");
