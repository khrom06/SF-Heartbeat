(() => {
"use strict";
// SF-kit 1.0 — shared design tokens and card base class. The same file ships in every SF-* card repository (keep them identical).
// Visual language: the palette and HUD frame of SF-Cards (https://github.com/khrom06/SF-Cards), so cards from different repos sit side by side.
const SF_VARS_DARK = `--sf-cyan:#00e5ff; --sf-amber:#ffb300; --sf-red:#ff3355; --sf-green:#2bff88; --sf-grey:#5b6b7d; --sf-text:#cfefff; --sf-dim:#7fa3bd;
    --sf-cyan-rgb:0 229 255; --sf-amber-rgb:255 179 0; --sf-red-rgb:255 51 85; --sf-green-rgb:43 255 136; --sf-fg-rgb:255 255 255; --sf-strong:#fff;
    --sf-bg0:#0d2440; --sf-bg1:#06101d; --sf-bg2:#03080f; --sf-on-accent:#03080f; --sf-violet:#b388ff; --sf-violet-rgb:179 136 255;`;
const SF_VARS_LIGHT = `--sf-cyan:#00798f; --sf-amber:#a85f00; --sf-red:#c8173d; --sf-green:#08783f; --sf-grey:#52687a; --sf-text:#1c3a4e; --sf-dim:#37536a;
    --sf-cyan-rgb:0 121 143; --sf-amber-rgb:168 95 0; --sf-red-rgb:200 23 61; --sf-green-rgb:8 120 63; --sf-fg-rgb:4 40 62; --sf-strong:#04141f;
    --sf-bg0:#fbfdff; --sf-bg1:#eef5fb; --sf-bg2:#e2edf6; --sf-on-accent:#fff; --sf-violet:#6a3bc4; --sf-violet-rgb:106 59 196;`;

const SF_BASE_CSS = `
  :host { display:block; ${SF_VARS_DARK} }
  :host([theme="light"]) { ${SF_VARS_LIGHT} }
  * { box-sizing:border-box; }
  :host([dir="rtl"]) .hud { direction:rtl; } :host([dir="rtl"]) svg, :host([dir="rtl"]) .track, :host([dir="rtl"]) input[type=range] { direction:ltr; }
  .hud { position:relative; overflow:hidden; border-radius:14px; padding:16px 18px 18px; color:var(--sf-text);
    background: radial-gradient(ellipse at 50% -20%, var(--sf-bg0) 0%, var(--sf-bg1) 60%, var(--sf-bg2) 100%);
    border:1px solid rgb(var(--sf-cyan-rgb) / .22); font-family:'B612 Mono', ui-monospace, monospace; font-size:13px;
    box-shadow: inset 0 0 40px rgb(var(--sf-cyan-rgb) / .06), 0 0 22px rgb(var(--sf-cyan-rgb) / .07); }
  .hud::after { content:""; position:absolute; inset:0; pointer-events:none;
    background: repeating-linear-gradient(0deg, rgb(var(--sf-fg-rgb) / .022) 0 1px, transparent 1px 3px); }
  .c { position:absolute; width:14px; height:14px; border-color:var(--sf-cyan); border-style:solid; opacity:.8; }
  .c.tl { top:6px; left:6px; border-width:2px 0 0 2px; } .c.tr { top:6px; right:6px; border-width:2px 2px 0 0; }
  .c.bl { bottom:6px; left:6px; border-width:0 0 2px 2px; } .c.br { bottom:6px; right:6px; border-width:0 2px 2px 0; }
  .head { display:flex; align-items:center; gap:10px; margin-bottom:14px; font-family:Orbitron, ui-sans-serif, sans-serif; font-weight:700;
    font-size:12px; letter-spacing:.22em; text-transform:uppercase; color:var(--sf-cyan); }
  .head .grow { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .head .tag { font-size:10px; letter-spacing:.12em; padding:2px 8px; border-radius:20px; border:1px solid currentColor; }
  .tag.ok { color:var(--sf-green); } .tag.warn { color:var(--sf-amber); } .tag.bad { color:var(--sf-red); }
  .empty { padding:18px 6px; text-align:center; color:var(--sf-dim); letter-spacing:.08em; }
  .err { color:var(--sf-red); padding:10px; border:1px dashed var(--sf-red); border-radius:8px; }
  [data-act] { cursor:pointer; }
  [data-act]:focus-visible, button:focus-visible, input:focus-visible { outline:2px solid var(--sf-cyan); outline-offset:2px; border-radius:6px; }
  button { font:inherit; color:inherit; background:rgb(var(--sf-cyan-rgb) / .1); border:1px solid rgb(var(--sf-cyan-rgb) / .35);
    border-radius:8px; padding:6px 12px; cursor:pointer; }
  button:hover { background:rgb(var(--sf-cyan-rgb) / .2); }
  @media (pointer: coarse) { button, .row { min-height:40px; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; } }
`;

const sfEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sfNum = (v, d = NaN) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const sfLang = (hass) => String((hass && (hass.locale?.language || hass.language)) || "en").slice(0, 2).toLowerCase();
// Translation lookup with English fallback: sfT(dict, lang, key, {n: 3}) replaces {n}.
const sfT = (dict, lang, key, vars) => {
  let s = (dict[lang] && dict[lang][key]) ?? (dict.en && dict.en[key]) ?? key;
  // In right-to-left text, numbers with Latin units are isolated so "5 min" is not scrambled by the bidi algorithm.
  if (vars) for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(lang === "ar" ? "\u2066" + vars[k] + "\u2069" : String(vars[k]));
  return s;
};
// Human duration from seconds: "45 s", "12 min", "3 h 05", "2 d 4 h".
const sfAge = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) return "–";
  if (sec < 90) return Math.round(sec) + " s";
  const m = Math.floor(sec / 60); if (m < 90) return m + " min";
  const h = Math.floor(m / 60); if (h < 48) return h + " h " + String(m % 60).padStart(2, "0");
  return Math.floor(h / 24) + " d " + (h % 24) + " h";
};
const sfName = (st, id) => (st && st.attributes && st.attributes.friendly_name) || id;
const sfMoreInfo = (el, entityId) => el.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));

// Base class. Subclasses provide: normalize(config) -> config, signature() -> string (cheap; the card re-renders only when it changes),
// body() -> html string, title(), tag() (optional {cls,text}), css (optional), onAct(el, ev) for [data-act] clicks, tick (ms, optional timer).
// Re-rendering never loops: it happens on (a) a new signature, (b) setConfig, (c) the optional timer, nothing else.
class SFCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: "open" }); this._cfg = null; this._hass = null; this._sig = null; this._timer = null;
    this.shadowRoot.addEventListener("click", (ev) => { const el = ev.target.closest && ev.target.closest("[data-act]"); if (el && this.onAct) this.onAct(el, ev); });
    this.shadowRoot.addEventListener("keydown", (ev) => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches("[data-act][role=button]")) { ev.preventDefault(); ev.target.click(); } });
  }
  setConfig(c) { if (!c || typeof c !== "object") throw new Error("Invalid configuration"); this._cfg = this.normalize(c); this._sig = null; this._draw(); }
  set hass(h) { this._hass = h; if (!this._cfg) return; const s = this.signature(); if (s !== this._sig) { this._sig = s; this._draw(); } }
  get hass() { return this._hass; }
  connectedCallback() { if (this.tick && !this._timer) this._timer = setInterval(() => this._draw(), this.tick); }
  disconnectedCallback() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  // Language: the card's own `language` option wins, otherwise the Home Assistant UI language (first two letters, e.g. zh-Hans -> zh).
  _lang() { const o = this._cfg && this._cfg.language; return typeof o === "string" && o ? o.slice(0, 2).toLowerCase() : sfLang(this._hass); }
  getCardSize() { return 3; }
  _theme() { const t = this._cfg && this._cfg.theme; if (t === "light" || t === "dark") return t; return this._hass && this._hass.themes && this._hass.themes.darkMode === false ? "light" : "dark"; }
  _draw() {
    if (!this._cfg) return;
    const root = this.shadowRoot, ae = root.activeElement;
    const keep = ae && ae.id ? { id: ae.id, value: ae.value, s: ae.selectionStart, e: ae.selectionEnd } : null;
    this.setAttribute("theme", this._theme()); this.setAttribute("dir", this._lang() === "ar" ? "rtl" : "ltr");
    let inner;
    try {
      const tag = this.tag ? this.tag() : null, ttl = this.title() || "";
      inner = `<div class="hud"><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>
        ${ttl || tag ? `<div class="head"><span class="grow">${sfEsc(ttl)}</span>${tag ? `<span class="tag ${tag.cls}">${sfEsc(tag.text)}</span>` : ""}</div>` : ""}${this.body()}</div>`;
    } catch (e) { inner = `<div class="hud"><div class="err">${sfEsc(this.constructor.name)}: ${sfEsc(e && e.message)}</div></div>`; }
    root.innerHTML = `<style>${SF_BASE_CSS}${this.css || ""}</style>${inner}`;
    if (keep) { const n = root.getElementById(keep.id); if (n) { if (n.value !== undefined && n.tagName === "INPUT" && n.type !== "range") n.value = keep.value; n.focus(); try { n.setSelectionRange(keep.s, keep.e); } catch (e) { /* not a text input */ } } }
  }
}
const sfRegister = (tag, cls, name, description) => {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === tag)) window.customCards.push({ type: tag, name, description, preview: false });
};
// Pure logic (no DOM): decides which entities are silent. Everything the card shows comes from classify().
// "Silent" = the entity is unavailable/unknown/missing, or (for entities in `watch`) it has not reported for longer than max_silence.
// Sensors on a Zigbee network keep their last value when the radio dies, so "unavailable" alone never catches that failure.
const HB_SKIP_DOMAINS = new Set(["update", "button", "scene", "event", "conversation", "tts", "stt", "device_tracker", "person", "zone", "sun", "persistent_notification", "input_button", "automation", "script", "image", "camera", "notify", "todo", "calendar"]);

function hbAgeSeconds(st, now) {
  const t = Date.parse(st.last_reported || st.last_updated || st.last_changed || "");
  return Number.isFinite(t) ? Math.max(0, (now - t) / 1000) : NaN;
}

function hbCompile(list) {
  const out = [];
  for (const p of list || []) { try { out.push(new RegExp(p, "i")); } catch (e) { /* ignore an invalid pattern rather than breaking the card */ } }
  return out;
}

// cfg: { watch: [id | {entity, max_silence}], max_silence (hours), scan_unavailable, ignore: [regex], battery_threshold, domains }
function hbClassify(states, cfg, now = Date.now()) {
  const ignore = hbCompile(cfg.ignore), silent = [], low = [];
  const limitDefault = cfg.max_silence * 3600;
  const watched = new Map();
  for (const w of cfg.watch) { const id = typeof w === "string" ? w : w.entity; if (id) watched.set(id, typeof w === "object" && w.max_silence > 0 ? w.max_silence * 3600 : limitDefault); }
  let total = 0;
  for (const [id, lim] of watched) {
    if (ignore.some((r) => r.test(id))) continue;
    total++;
    const st = states[id];
    if (!st) { silent.push({ id, name: id, reason: "missing", age: NaN }); continue; }
    const age = hbAgeSeconds(st, now);
    if (st.state === "unavailable" || st.state === "unknown") silent.push({ id, name: sfName(st, id), reason: "unavailable", age });
    else if (age > lim) silent.push({ id, name: sfName(st, id), reason: "stale", age });
  }
  const domains = new Set(cfg.domains);
  for (const id of Object.keys(states)) {
    const st = states[id], dom = id.split(".")[0];
    if (cfg.scan_unavailable && !watched.has(id) && domains.has(dom) && !HB_SKIP_DOMAINS.has(dom) && !ignore.some((r) => r.test(id))) {
      total++;
      if (st.state === "unavailable") silent.push({ id, name: sfName(st, id), reason: "unavailable", age: hbAgeSeconds(st, now) });
    }
    if (cfg.battery_threshold > 0 && dom === "sensor" && st.attributes && st.attributes.device_class === "battery" && !ignore.some((r) => r.test(id))) {
      const pct = sfNum(st.state);
      if (Number.isFinite(pct) && pct <= cfg.battery_threshold) low.push({ id, name: sfName(st, id), pct });
    }
  }
  // Unavailable entities that are also stale are the same fault: oldest first so the longest-silent sensor leads.
  silent.sort((a, b) => (Number.isFinite(b.age) ? b.age : 1e12) - (Number.isFinite(a.age) ? a.age : 1e12));
  low.sort((a, b) => a.pct - b.pct);
  return { silent, low, total };
}
const HB_I18N = {
  en: { title: "Sensor heartbeat", ok: "All sensors reporting", silent: "silent", nominal: "{n} watched · all reporting", stale: "no report for {age}", unavailable: "unavailable", missing: "entity not found",
        batt: "Low batteries", more: "+{n} more", watching: "{n} watched" },
  fr: { title: "Pouls des capteurs", ok: "Tous les capteurs répondent", silent: "muet(s)", nominal: "{n} surveillés · tous répondent", stale: "aucun rapport depuis {age}", unavailable: "indisponible", missing: "entité introuvable",
        batt: "Piles faibles", more: "+{n} autres", watching: "{n} surveillés" },
  de: { title: "Sensor-Herzschlag", ok: "Alle Sensoren melden sich", silent: "stumm", nominal: "{n} überwacht · alle melden sich", stale: "kein Bericht seit {age}", unavailable: "nicht verfügbar", missing: "Entität nicht gefunden",
        batt: "Schwache Batterien", more: "+{n} weitere", watching: "{n} überwacht" },
  es: { title: "Pulso de sensores", ok: "Todos los sensores responden", silent: "mudo(s)", nominal: "{n} vigilados · todos responden", stale: "sin informe desde hace {age}", unavailable: "no disponible", missing: "entidad no encontrada",
        batt: "Pilas bajas", more: "+{n} más", watching: "{n} vigilados" },
  nl: {"title": "Hartslag van sensoren", "ok": "Alle sensoren melden zich", "silent": "stil", "nominal": "{n} bewaakt · alle melden zich", "stale": "geen melding sinds {age}", "unavailable": "niet beschikbaar", "missing": "entiteit niet gevonden", "batt": "Lage batterijen", "more": "+{n} meer", "watching": "{n} bewaakt"},
  it: {"title": "Battito dei sensori", "ok": "Tutti i sensori rispondono", "silent": "muto/i", "nominal": "{n} monitorati · tutti rispondono", "stale": "nessun rapporto da {age}", "unavailable": "non disponibile", "missing": "entità non trovata", "batt": "Batterie scariche", "more": "+{n} altri", "watching": "{n} monitorati"},
  pt: {"title": "Pulso dos sensores", "ok": "Todos os sensores respondem", "silent": "mudo(s)", "nominal": "{n} monitorizados · todos respondem", "stale": "sem relatório há {age}", "unavailable": "indisponível", "missing": "entidade não encontrada", "batt": "Pilhas fracas", "more": "+{n} mais", "watching": "{n} monitorizados"},
  pl: {"title": "Puls czujników", "ok": "Wszystkie czujniki odpowiadają", "silent": "milczy", "nominal": "{n} monitorowanych · wszystkie odpowiadają", "stale": "brak raportu od {age}", "unavailable": "niedostępny", "missing": "nie znaleziono encji", "batt": "Słabe baterie", "more": "+{n} więcej", "watching": "{n} monitorowanych"},
  ru: {"title": "Пульс датчиков", "ok": "Все датчики отвечают", "silent": "молчат", "nominal": "{n} под наблюдением · все отвечают", "stale": "нет данных уже {age}", "unavailable": "недоступен", "missing": "сущность не найдена", "batt": "Слабые батареи", "more": "ещё {n}", "watching": "{n} под наблюдением"},
  zh: {"title": "传感器心跳", "ok": "所有传感器均在上报", "silent": "静默", "nominal": "监控 {n} 个 · 全部正常上报", "stale": "已 {age} 无上报", "unavailable": "不可用", "missing": "未找到实体", "batt": "电量低的电池", "more": "另有 {n} 个", "watching": "监控 {n} 个"},
  ar: {"title": "نبض المستشعرات", "ok": "جميع المستشعرات تعمل", "silent": "صامت", "nominal": "{n} قيد المراقبة · الكل يرسل بياناته", "stale": "لا تقرير منذ {age}", "unavailable": "غير متوفر", "missing": "الكيان غير موجود", "batt": "بطاريات ضعيفة", "more": "+{n} أخرى", "watching": "{n} قيد المراقبة"},
};

class SFHeartbeatCard extends SFCard {
  static getStubConfig() { return { watch: [], scan_unavailable: true, max_silence: 2 }; }
  normalize(c) {
    const hours = sfNum(c.max_silence, 2);
    return { ...c, watch: Array.isArray(c.watch) ? c.watch : [], ignore: Array.isArray(c.ignore) ? c.ignore : [], max_silence: hours > 0 ? hours : 2,
      scan_unavailable: c.scan_unavailable !== false, battery_threshold: sfNum(c.battery_threshold, 20), max_rows: Math.max(1, Math.round(sfNum(c.max_rows, 8))),
      domains: Array.isArray(c.domains) && c.domains.length ? c.domains : ["sensor", "binary_sensor", "switch", "light", "climate", "cover", "lock", "fan", "media_player", "number", "select", "humidifier", "water_heater", "vacuum"] };
  }
  get tick() { return 60000; }          // ages move with time even when no state changes
  _res() { return hbClassify(this._hass ? this._hass.states : {}, this._cfg); }
  // Signature: ids + reasons + coarse state of what matters; ages are refreshed by the 60 s timer, so a stream of state changes elsewhere never re-renders.
  signature() { const r = this._res(); return r.silent.map((s) => s.id + ":" + s.reason).join("|") + "#" + r.low.map((l) => l.id + ":" + l.pct).join("|") + this._theme(); }
  title() { return this._cfg.title || sfT(HB_I18N, this._lang(), "title"); }
  tag() { const r = this._res(), L = this._lang(); return r.silent.length ? { cls: "bad", text: r.silent.length + " " + sfT(HB_I18N, L, "silent") } : { cls: "ok", text: "OK" }; }
  get css() { return `
    .pulse { display:block; width:100%; height:46px; margin:-4px 0 10px; } .pulse path { fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .pulse.ok path { stroke:var(--sf-green); filter:drop-shadow(0 0 4px rgb(var(--sf-green-rgb) / .7)); stroke-dasharray:240; animation:beat 2.6s linear infinite; }
    .pulse.bad path { stroke:var(--sf-red); filter:drop-shadow(0 0 4px rgb(var(--sf-red-rgb) / .7)); }
    @keyframes beat { from { stroke-dashoffset:240; } to { stroke-dashoffset:-240; } }
    .row { display:flex; align-items:center; gap:10px; padding:7px 4px; border-top:1px solid rgb(var(--sf-cyan-rgb) / .12); }
    .row:first-of-type { border-top:0; } .row:hover { background:rgb(var(--sf-cyan-rgb) / .06); }
    .dot { width:8px; height:8px; border-radius:50%; flex:none; background:var(--sf-red); box-shadow:0 0 6px var(--sf-red); }
    .dot.unavailable { background:var(--sf-amber); box-shadow:0 0 6px var(--sf-amber); } .dot.batt { background:var(--sf-amber); box-shadow:0 0 6px var(--sf-amber); }
    .nm { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--sf-strong); }
    .why { color:var(--sf-dim); font-size:11px; text-align:right; white-space:nowrap; }
    .sub { margin:12px 0 4px; font-family:Orbitron, ui-sans-serif, sans-serif; font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--sf-amber); }
    .more { padding:6px 4px; color:var(--sf-dim); font-size:11px; }`; }
  body() {
    const r = this._res(), L = this._lang(), t = (k, v) => sfT(HB_I18N, L, k, v), max = this._cfg.max_rows;
    const ECG = "M0 24 H70 L82 24 L90 8 L100 40 L108 24 H150 L160 24 L168 14 L176 34 L184 24 H240";
    let h = `<svg class="pulse ${r.silent.length ? "bad" : "ok"}" viewBox="0 0 240 48" preserveAspectRatio="none" aria-hidden="true"><path d="${ECG}"/></svg>`;
    if (!r.silent.length && !r.low.length) return h + `<div class="empty">${sfEsc(t("ok"))}<br><small>${sfEsc(t("nominal", { n: r.total }))}</small></div>`;
    const row = (cls, id, name, why) => `<div class="row" data-act="info" data-id="${sfEsc(id)}" role="button" tabindex="0"><span class="dot ${cls}"></span><span class="nm">${sfEsc(name)}</span><span class="why">${sfEsc(why)}</span></div>`;
    for (const s of r.silent.slice(0, max)) h += row(s.reason, s.id, s.name, s.reason === "stale" ? t("stale", { age: sfAge(s.age) }) : s.reason === "missing" ? t("missing") : t("unavailable") + (Number.isFinite(s.age) ? " · " + sfAge(s.age) : ""));
    if (r.silent.length > max) h += `<div class="more">${sfEsc(t("more", { n: r.silent.length - max }))}</div>`;
    if (r.low.length) { h += `<div class="sub">${sfEsc(t("batt"))}</div>`; for (const b of r.low.slice(0, max)) h += row("batt", b.id, b.name, Math.round(b.pct) + " %"); }
    return h;
  }
  onAct(el) { if (el.dataset.act === "info") sfMoreInfo(this, el.dataset.id); }
}
sfRegister("sf-heartbeat-card", SFHeartbeatCard, "SF Heartbeat", "Lists sensors that stopped reporting (stale, unavailable, missing) and low batteries.");
window.__sfHeartbeat = { classify: hbClassify, i18n: HB_I18N };   // exposed for the test page only

})();
