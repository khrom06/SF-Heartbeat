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
  if (vars) for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
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
  getCardSize() { return 3; }
  _theme() { const t = this._cfg && this._cfg.theme; if (t === "light" || t === "dark") return t; return this._hass && this._hass.themes && this._hass.themes.darkMode === false ? "light" : "dark"; }
  _draw() {
    if (!this._cfg) return;
    const root = this.shadowRoot, ae = root.activeElement;
    const keep = ae && ae.id ? { id: ae.id, value: ae.value, s: ae.selectionStart, e: ae.selectionEnd } : null;
    this.setAttribute("theme", this._theme());
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
