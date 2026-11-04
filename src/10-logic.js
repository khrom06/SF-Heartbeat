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
