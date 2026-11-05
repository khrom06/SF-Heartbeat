# Changelog

## [1.0.1]
### Changed
- `dist/sf-heartbeat.js` (the file HACS loads) is now minified at build time (esbuild): ~17% smaller raw. No behaviour change — `src/` stays the readable source of truth; the 282 render checks pass unchanged.
- The loaded file now prints its version to the console (`SF-HEARTBEAT v1.0.1`) and warns, instead of silently redefining the cards, if the resource is declared twice (HACS + a manual file) — same pattern as SF-Cards. Verified in a real browser: second load is ignored with a clear warning, version banner confirmed.

## [1.0.0] — 2026-11-04
### Added
- `sf-heartbeat-card`: silent / unavailable / missing entities, low batteries, light and dark themes, en/fr/de/es.
- Blueprint *silent sensor alert* (silent, recovered, reminder events).
- Blueprint *graded repair* (two repair steps with recovery checks, cooldown, single mode).
- Render tests in headless Chrome; optional live-instance test of the blueprint templates.
