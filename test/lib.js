// Minimal test helpers shared by the render tests (no dependencies). Failures are collected, never thrown, so one bad case does not hide the others.
window.T = (() => {
  const failures = []; let count = 0;
  const check = (cond, msg) => { count++; if (!cond) failures.push(msg); };
  const eq = (a, b, msg) => check(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  const state = (entity_id, state, attributes = {}, extra = {}) => ({ entity_id, state: String(state), attributes, last_changed: extra.last_changed || new Date(Date.now() - 60e3).toISOString(),
    last_updated: extra.last_updated || extra.last_changed || new Date(Date.now() - 60e3).toISOString(), last_reported: extra.last_reported || extra.last_updated || extra.last_changed || new Date(Date.now() - 60e3).toISOString() });
  const ago = (sec) => new Date(Date.now() - sec * 1000).toISOString();
  const hass = (states, extra = {}) => ({ states: Object.fromEntries(states.map((s) => [s.entity_id, s])), language: "en", themes: { darkMode: true }, calls: [], ws: [],
    callService(d, s, data) { this.calls.push({ d, s, data }); return Promise.resolve(); }, callWS(msg) { this.ws.push(msg); return Promise.resolve(extra.wsResult ? extra.wsResult(msg) : []); }, ...extra });
  const mount = (tag, config, h) => { const el = document.createElement(tag); document.body.appendChild(el); el.setConfig(config); if (h) el.hass = h; return el; };
  const text = (el) => el.shadowRoot.textContent.replace(/\s+/g, " ").trim();
  const q = (el, sel) => el.shadowRoot.querySelectorAll(sel);
  // Every supported language must define exactly the English keys, non-empty, with the same {placeholders}.
  const LANGS = ["en", "fr", "es", "de", "nl", "it", "pt", "pl", "ru", "zh", "ar"];
  const ph = (t) => (String(t).match(/\{\w+\}/g) || []).sort().join(",");
  const i18n = (dict, name) => {
    for (const l of LANGS) {
      check(dict[l] && typeof dict[l] === "object", `${name}: language ${l} is missing`); if (!dict[l]) continue;
      const keys = Object.keys(dict.en);
      eq(Object.keys(dict[l]).sort(), keys.slice().sort(), `${name}/${l}: same keys as English`);
      for (const k of keys) { check(typeof dict[l][k] === "string" && dict[l][k].trim() !== "", `${name}/${l}/${k}: empty`); eq(ph(dict[l][k]), ph(dict.en[k]), `${name}/${l}/${k}: placeholders`); }
    }
    eq(Object.keys(dict).sort(), LANGS.slice().sort(), `${name}: exactly the supported languages`);
  };
  const done = () => { const r = { ok: failures.length === 0, checks: count, failures }; document.getElementById("result").textContent = JSON.stringify(r); return r; };
  return { check, eq, state, ago, hass, mount, text, q, i18n, LANGS, done, sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };
})();
