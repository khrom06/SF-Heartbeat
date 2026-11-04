const HB_I18N = {
  en: { title: "Sensor heartbeat", ok: "All sensors reporting", silent: "silent", nominal: "{n} watched · all reporting", stale: "no report for {age}", unavailable: "unavailable", missing: "entity not found",
        batt: "Low batteries", more: "+{n} more", watching: "{n} watched" },
  fr: { title: "Pouls des capteurs", ok: "Tous les capteurs répondent", silent: "muet(s)", nominal: "{n} surveillés · tous répondent", stale: "aucun rapport depuis {age}", unavailable: "indisponible", missing: "entité introuvable",
        batt: "Piles faibles", more: "+{n} autres", watching: "{n} surveillés" },
  de: { title: "Sensor-Herzschlag", ok: "Alle Sensoren melden sich", silent: "stumm", nominal: "{n} überwacht · alle melden sich", stale: "kein Bericht seit {age}", unavailable: "nicht verfügbar", missing: "Entität nicht gefunden",
        batt: "Schwache Batterien", more: "+{n} weitere", watching: "{n} überwacht" },
  es: { title: "Pulso de sensores", ok: "Todos los sensores responden", silent: "mudo(s)", nominal: "{n} vigilados · todos responden", stale: "sin informe desde hace {age}", unavailable: "no disponible", missing: "entidad no encontrada",
        batt: "Pilas bajas", more: "+{n} más", watching: "{n} vigilados" },
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
  title() { return this._cfg.title || sfT(HB_I18N, sfLang(this._hass), "title"); }
  tag() { const r = this._res(), L = sfLang(this._hass); return r.silent.length ? { cls: "bad", text: r.silent.length + " " + sfT(HB_I18N, L, "silent") } : { cls: "ok", text: "OK" }; }
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
    const r = this._res(), L = sfLang(this._hass), t = (k, v) => sfT(HB_I18N, L, k, v), max = this._cfg.max_rows;
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
window.__sfHeartbeat = { classify: hbClassify };   // exposed for the test page only
