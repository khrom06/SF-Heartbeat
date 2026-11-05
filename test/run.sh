#!/bin/bash
# Tests: build is up to date, syntax, then every card is rendered in headless Chrome against fake Home Assistant data (test/render.html).
# Requirements: node and google-chrome (or chromium). Usage: ./test/run.sh — non-zero exit code if a test fails.
set -uo pipefail
cd "$(dirname "$0")/.."
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[ -n "$CHROME" ] || { echo "ERROR: google-chrome/chromium not found"; exit 2; }
[ -d node_modules/esbuild ] || npm install --no-audit --no-fund || exit 1   # scripts/build.mjs needs esbuild (minification)
node scripts/build.mjs --check || exit 1
NAME="$(node -e 'console.log(JSON.parse(require("fs").readFileSync("hacs.json","utf8")).filename)')"
node --check "dist/$NAME" || { echo "FAIL: syntax of dist/$NAME"; exit 1; }
[ ! -f test/extra.sh ] || bash test/extra.sh || exit 1
OUT="$(timeout 120 "$CHROME" --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files --virtual-time-budget=60000 --dump-dom "file://$PWD/test/render.html" 2>/dev/null)"
RES="$(printf '%s' "$OUT" | grep -o '<pre id="result">[^<]*' | sed 's/<pre id="result">//' | sed 's/&quot;/"/g;s/&amp;/\&/g;s/&lt;/</g;s/&gt;/>/g')"
[ -n "$RES" ] || { echo "FAIL: the render test produced no verdict (loading error?)"; exit 1; }
printf '%s' "$RES" | node -e '
  const r = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (r.ok) { console.log("OK: all render tests pass (" + r.checks + " checks)"); process.exit(0); }
  console.log("FAIL: " + r.failures.length + " problem(s)"); r.failures.forEach((f) => console.log(" - " + f)); process.exit(1);'
