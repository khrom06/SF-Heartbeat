// Helpers for the end-to-end tests on a REAL Home Assistant (no mocks): login, REST calls, state polling, blueprint-based automations.
// HA_URL (default http://localhost:8123), HA_USER / HA_PASS (a user created with `python -m homeassistant --script auth ... add`).
const HA = (process.env.HA_URL || "http://localhost:8123").replace(/\/$/, "");
const USER = process.env.HA_USER || "ci", PASS = process.env.HA_PASS || "ci-pass";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let token = "";

export async function login() {
  for (let i = 0; i < 90; i++) { try { await fetch(HA + "/"); break; } catch { /* not listening yet */ } await sleep(2000); }
  const cid = HA + "/";
  let r = await fetch(HA + "/auth/login_flow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_id: cid, handler: ["homeassistant", null], redirect_uri: cid }) });
  const flow = await r.json();
  r = await fetch(HA + "/auth/login_flow/" + flow.flow_id, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: USER, password: PASS, client_id: cid }) });
  const res = await r.json(); if (!res.result) throw new Error("login failed: " + JSON.stringify(res));
  r = await fetch(HA + "/auth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code: res.result, client_id: cid }) });
  const t = await r.json(); if (!t.access_token) throw new Error("token failed: " + JSON.stringify(t));
  token = t.access_token;
  for (let i = 0; i < 90; i++) { try { const s = await api("/api/"); if (s.ok) return; } catch { /* not ready */ } await sleep(2000); }
  throw new Error("Home Assistant API not ready");
}

export async function api(path, method = "GET", body) {
  const r = await fetch(HA + path, { method, headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { ok: r.ok, status: r.status, json };
}
export const state = async (id) => { const r = await api("/api/states/" + id); return r.ok ? r.json.state : null; };
export const call = (domain, service, data) => api(`/api/services/${domain}/${service}`, "POST", data);
export const setNumber = (id, v) => call("input_number", "set_value", { entity_id: id, value: v });
export const setBool = (id, on) => call("input_boolean", on ? "turn_on" : "turn_off", { entity_id: id });

// Polls until fn() is truthy; returns true / false (never throws, so the caller records a readable failure).
export async function until(fn, timeoutMs, stepMs = 500) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) { try { if (await fn()) return true; } catch { /* keep polling */ } await sleep(stepMs); }
  return false;
}
// Stays true for the whole duration (e.g. "this load never switched").
export async function holds(fn, durationMs, stepMs = 500) {
  const end = Date.now() + durationMs;
  while (Date.now() < end) { if (!(await fn())) return false; await sleep(stepMs); }
  return true;
}
export async function createAutomation(id, alias, blueprintPath, input) {
  const r = await api("/api/config/automation/config/" + id, "POST", { alias, description: "", use_blueprint: { path: blueprintPath, input } });
  if (!r.ok) throw new Error("create automation: " + r.status + " " + JSON.stringify(r.json));
  await sleep(1500);
  const slug = alias.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), s = await state("automation." + slug); if (s !== "on") throw new Error(`automation.${slug} is '${s}' after creation (blueprint rejected?)`);
}
// Collects failures instead of throwing, prints a result line per check, exit code 1 when anything failed.
export function checker() {
  const fails = [];
  return { check(name, ok, extra = "") { console.log((ok ? "OK   " : "FAIL ") + name + (ok ? "" : " " + extra)); if (!ok) fails.push(name); },
           done() { console.log(fails.length ? `\nFAILED: ${fails.length} check(s)` : "\nAll end-to-end checks passed"); process.exit(fails.length ? 1 : 0); } };
}
